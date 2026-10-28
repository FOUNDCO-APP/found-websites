-- Local first build only. Install and enable receiving separately after review.
create table public.found_mail_received (
  id uuid primary key default gen_random_uuid(), provider_email_id text not null unique,
  from_address text, from_name text, reply_to_address text, to_addresses text[] not null default '{}',
  subject text, body_text text, message_id text, in_reply_to text, reference_ids text[] not null default '{}',
  attachments jsonb not null default '[]' check (jsonb_typeof(attachments) = 'array'),
  folder text not null default 'inbox' check (folder in ('inbox','spam')),
  spam_reasons text[] not null default '{}', read_at timestamptz,
  hard_blocked boolean not null default false, authentication jsonb not null default '{"spf":"unknown","dkim":"unknown","dmarc":"unknown"}', reply_warnings text[] not null default '{}',
  processing_state text not null default 'pending' check (processing_state in ('pending','processing','ready','failed')),
  received_at timestamptz not null default now(), last_error text,
  attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
  lease_token uuid, lease_until timestamptz, updated_at timestamptz not null default now()
);
create index found_mail_received_queue on public.found_mail_received (next_attempt_at,received_at)
  where processing_state <> 'ready';
create index found_mail_received_folder on public.found_mail_received (folder,received_at desc,id desc);
create table public.found_mail_events (
  event_id text primary key, provider_email_id text not null,
  received_id uuid not null references public.found_mail_received(id),
  created_at timestamptz not null default now()
);
create table public.found_mail_replies (
  id uuid primary key default gen_random_uuid(), parent_id uuid not null references public.found_mail_received(id),
  body_text text not null, to_address text not null, from_address text not null, subject text not null,
  status text not null default 'draft' check(status in ('draft','sending','accepted','delivered','failed','unconfirmed')),
  provider_email_id text, provider_message_id text, idempotency_key text not null unique,
  last_error text, lease_until timestamptz, lease_token uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index found_mail_replies_parent on public.found_mail_replies(parent_id,created_at,id);
create table public.found_mail_rules (
  sender_address text primary key check (sender_address = lower(btrim(sender_address))),
  action text not null check(action in ('block','allow')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.found_mail_received enable row level security;
alter table public.found_mail_events enable row level security;
alter table public.found_mail_replies enable row level security;
alter table public.found_mail_rules enable row level security;
revoke all on public.found_mail_received,public.found_mail_events,public.found_mail_replies,public.found_mail_rules from public,anon,authenticated;
grant select,insert,update,delete on public.found_mail_received,public.found_mail_events,public.found_mail_replies,public.found_mail_rules to service_role;
create policy found_mail_received_service on public.found_mail_received to service_role using(true) with check(true);
create policy found_mail_events_service on public.found_mail_events to service_role using(true) with check(true);
create policy found_mail_replies_service on public.found_mail_replies to service_role using(true) with check(true);
create policy found_mail_rules_service on public.found_mail_rules to service_role using(true) with check(true);

create function public.found_mail_accept(p_event_id text,p_provider_id text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare r uuid; prior public.found_mail_events%rowtype;
begin
  if coalesce(length(p_event_id),0) not between 1 and 256 or coalesce(length(p_provider_id),0) not between 1 and 256 then
    raise exception 'Invalid event identity';
  end if;
  insert into public.found_mail_received(provider_email_id) values(p_provider_id)
    on conflict(provider_email_id) do nothing;
  select id into r from public.found_mail_received where provider_email_id=p_provider_id;
  insert into public.found_mail_events(event_id,provider_email_id,received_id) values(p_event_id,p_provider_id,r)
    on conflict(event_id) do nothing;
  select * into prior from public.found_mail_events where event_id=p_event_id;
  if prior.provider_email_id is distinct from p_provider_id then raise exception 'Event identity conflict'; end if;
  return prior.received_id;
end; $$;

create function public.found_mail_claim(p_token uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.found_mail_received%rowtype;
begin
  if p_token is null then raise exception 'Lease token required'; end if;
  update public.found_mail_received set processing_state='failed',lease_token=null,lease_until=null,
    last_error='Processing attempts exhausted. Manual review required.',updated_at=now()
    where processing_state='processing' and lease_until<=now() and attempts>=8;
  select * into r from public.found_mail_received
    where attempts < 8 and next_attempt_at <= now()
      and (processing_state in ('pending','failed') or (processing_state='processing' and lease_until <= now()))
    order by received_at,id for update skip locked limit 1;
  if not found then return null; end if;
  update public.found_mail_received set processing_state='processing',attempts=attempts+1,
    lease_token=p_token,lease_until=now()+interval '2 minutes',updated_at=now()
    where id=r.id returning * into r;
  return to_jsonb(r);
end; $$;

create function public.found_mail_complete(p_id uuid,p_token uuid,p_content jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare blocked boolean;
begin
  if p_content->>'folder' is null or p_content->>'folder' not in ('inbox','spam') then raise exception 'Invalid folder'; end if;
  -- Same sender key/order as 002 save/claim and found_mail_change: sender before parent.
  perform pg_advisory_xact_lock(hashtextextended('found-mail/sender/'||coalesce(p_content->>'from_address',''),0));
  select exists(select 1 from public.found_mail_rules where sender_address=p_content->>'from_address' and action='block') into blocked;
  update public.found_mail_received set
    from_address=p_content->>'from_address',from_name=p_content->>'from_name',reply_to_address=p_content->>'reply_to_address',
    to_addresses=array(select jsonb_array_elements_text(p_content->'to_addresses')),
    subject=p_content->>'subject',body_text=p_content->>'body_text',message_id=p_content->>'message_id',
    in_reply_to=p_content->>'in_reply_to',reference_ids=array(select jsonb_array_elements_text(p_content->'reference_ids')),
    attachments=coalesce(p_content->'attachments','[]'::jsonb),folder=case when blocked then 'spam' else p_content->>'folder' end,
    spam_reasons=array(select jsonb_array_elements_text(p_content->'spam_reasons'))||case when blocked then array['Sender is blocked'] else '{}'::text[] end,
    hard_blocked=blocked or coalesce((p_content->>'hard_blocked')::boolean,false),
    authentication=coalesce(p_content->'authentication','{}'::jsonb),
    reply_warnings=array(select jsonb_array_elements_text(p_content->'reply_warnings')),
    processing_state='ready',last_error=null,lease_until=null,lease_token=null,updated_at=now()
    where id=p_id and processing_state='processing' and lease_token=p_token and lease_until>now();
  return found;
end; $$;

create function public.found_mail_fail(p_id uuid,p_token uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  update public.found_mail_received set processing_state='failed',
    last_error=case when attempts>=8 then 'Processing attempts exhausted. Manual review required.' else 'Message retrieval or processing failed. Retry pending.' end,
    next_attempt_at=now()+least(interval '1 hour',interval '30 seconds'*power(2,least(attempts,7))),
    lease_token=null,lease_until=null,updated_at=now()
    where id=p_id and processing_state='processing' and lease_token=p_token and lease_until>now();
  return found;
end; $$;
revoke all on function public.found_mail_accept(text,text),public.found_mail_claim(uuid),public.found_mail_complete(uuid,uuid,jsonb),public.found_mail_fail(uuid,uuid) from public,anon,authenticated;
grant execute on function public.found_mail_accept(text,text),public.found_mail_claim(uuid),public.found_mail_complete(uuid,uuid,jsonb),public.found_mail_fail(uuid,uuid) to service_role;

-- Admin actions share the parent lock with retrieval and manual reply claims.
create function public.found_mail_change(p_id uuid,p_action text,p_value text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare m public.found_mail_received%rowtype; sender text;
begin
  if p_action is null or p_action not in ('read','move','rule','retry') then raise exception 'Invalid mail action'; end if;
  select from_address into sender from public.found_mail_received where id=p_id;
  if not found then return false; end if;
  -- Never acquire a sender advisory lock after holding a parent/reply row lock.
  perform pg_advisory_xact_lock(hashtextextended('found-mail/sender/'||coalesce(sender,''),0));
  select * into m from public.found_mail_received where id=p_id for update;
  if not found then return false; end if;
  if m.from_address is distinct from sender then raise exception 'Message sender changed. Refresh and retry'; end if;
  -- Retain tokens, provider IDs, and all other send evidence for reconciliation.
  update public.found_mail_replies r set status='unconfirmed',
    last_error=coalesce(r.last_error,'Send confirmation was interrupted. Reconcile before sending again.'),updated_at=now()
    where r.status='sending' and (r.lease_until is null or r.lease_until<=now())
      and (r.parent_id=m.id or (sender is not null and exists(
        select 1 from public.found_mail_received other where other.id=r.parent_id and other.from_address=sender)));
  if p_action='read' then
    if p_value is null or p_value not in ('1','0') then raise exception 'Invalid read state'; end if;
    update public.found_mail_received set read_at=case when p_value='1' then now() else null end,updated_at=now() where id=m.id;
    return true;
  end if;
  if exists(select 1 from public.found_mail_replies where parent_id=m.id and status='sending') then
    raise exception 'Reply send requires reconciliation before changing this message';
  end if;
  if p_action='move' then
    if p_value is null or p_value not in ('inbox','spam') then raise exception 'Invalid folder'; end if;
    -- A retrieval can classify only once. Do not race it with a manual move.
    if m.processing_state<>'ready' then raise exception 'Wait for message retrieval before moving it'; end if;
    update public.found_mail_received set folder=p_value,updated_at=now() where id=m.id;
  elsif p_action='rule' then
    if p_value is null or p_value not in ('allow','block','clear') or m.from_address is null then raise exception 'Invalid sender rule'; end if;
    if m.processing_state<>'ready' then raise exception 'Wait for message retrieval before changing sender rules'; end if;
    if exists(select 1 from public.found_mail_replies r join public.found_mail_received other on other.id=r.parent_id
      where other.from_address=sender and r.status='sending') then
      raise exception 'A reply to this sender is already in progress. Review before changing sender rules';
    end if;
    if p_value='clear' then delete from public.found_mail_rules where sender_address=m.from_address;
    else insert into public.found_mail_rules(sender_address,action) values(m.from_address,p_value)
      on conflict(sender_address) do update set action=excluded.action,updated_at=now(); end if;
  else
    if m.processing_state='pending' then return true; end if;
    if m.processing_state='ready' or (m.processing_state='processing' and m.lease_until>now()) then
      raise exception 'Retrieval is complete or already in progress';
    end if;
    update public.found_mail_received set processing_state='pending',attempts=0,next_attempt_at=now(),
      lease_token=null,lease_until=null,last_error=null,updated_at=now() where id=m.id;
  end if;
  return true;
end; $$;
revoke all on function public.found_mail_change(uuid,text,text) from public,anon,authenticated;
grant execute on function public.found_mail_change(uuid,text,text) to service_role;
