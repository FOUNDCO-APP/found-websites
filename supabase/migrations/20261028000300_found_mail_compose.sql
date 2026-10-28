-- Additive local Compose/alias extension. No provider configuration or sends.
alter table public.found_mail_replies alter column parent_id drop not null;
alter table public.found_mail_replies add column intent text not null default 'reply'
  check(intent in ('reply','compose'));
alter table public.found_mail_replies add constraint found_mail_reply_intent_parent
  check((intent='reply' and parent_id is not null) or (intent='compose' and parent_id is null));

create function public.found_mail_reply_from_allowed(p_addresses text[],p_from text)
returns boolean language sql immutable security invoker set search_path='' as $$
  select coalesce(p_from in ('hello@foundco.app','support@foundco.app','shawn@foundco.app')
    and (not(coalesce(p_addresses,'{}'::text[]) && array['hello@foundco.app','support@foundco.app','shawn@foundco.app'])
      or p_from=any(p_addresses)),false)
$$;
revoke all on function public.found_mail_reply_from_allowed(text[],text) from public,anon,authenticated;
grant execute on function public.found_mail_reply_from_allowed(text[],text) to service_role;

create or replace function public.found_mail_save_reply(p_parent_id uuid,p_reply_id uuid,p_body text,p_to text,p_from text,p_subject text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare m public.found_mail_received%rowtype; r public.found_mail_replies%rowtype; new_id uuid; lock_sender text;
begin
  -- Shared order with found_mail_change: sender advisory, parent, reply.
  select from_address into lock_sender from public.found_mail_received where id=p_parent_id;
  if lock_sender is null then raise exception 'Message requires review before replying'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('found-mail/sender/'||coalesce(lock_sender,''),0));
  select * into m from public.found_mail_received where id=p_parent_id for update;
  if m.from_address is distinct from lock_sender then raise exception 'Sender changed. Refresh and review'; end if;
  if not found or m.processing_state<>'ready' or m.folder<>'inbox' or m.hard_blocked then raise exception 'Message requires review before replying'; end if;
  if exists(select 1 from public.found_mail_rules where sender_address=m.from_address and action='block') then raise exception 'Sender is blocked'; end if;
  if p_to is distinct from coalesce(m.reply_to_address,m.from_address) or p_to in ('hello@foundco.app','support@foundco.app','shawn@foundco.app') then raise exception 'Reply recipient changed'; end if;
  if not public.found_mail_reply_from_allowed(m.to_addresses,p_from) then raise exception 'Unsupported sending address'; end if;
  if p_body is null or length(btrim(p_body)) not between 1 and 20000 or position(chr(13) in p_to)>0 or position(chr(10) in p_to)>0 then raise exception 'Invalid reply'; end if;
  if p_subject is null or length(p_subject)>504 or position(chr(13) in p_subject)>0 or position(chr(10) in p_subject)>0 then raise exception 'Invalid subject'; end if;
  if p_reply_id is not null then
    select * into r from public.found_mail_replies where id=p_reply_id and parent_id=p_parent_id for update;
    if found then
      if r.status<>'draft' then raise exception 'Only an unsent draft can be edited'; end if;
      update public.found_mail_replies set body_text=p_body,to_address=p_to,from_address=p_from,subject=p_subject,updated_at=now() where id=r.id returning * into r;
    else
      insert into public.found_mail_replies(id,parent_id,body_text,to_address,from_address,subject,idempotency_key)
        values(p_reply_id,p_parent_id,p_body,p_to,p_from,p_subject,'found-reply/'||p_reply_id::text) returning * into r;
    end if;
  else
    new_id:=gen_random_uuid();
    insert into public.found_mail_replies(id,parent_id,body_text,to_address,from_address,subject,idempotency_key)
      values(new_id,p_parent_id,p_body,p_to,p_from,p_subject,'found-reply/'||new_id::text) returning * into r;
  end if;
  return to_jsonb(r);
end; $$;

create or replace function public.found_mail_claim_reply_reviewed(p_id uuid,p_parent_id uuid,p_to text,p_from text,p_token uuid,p_expected_updated_at timestamptz)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare m public.found_mail_received%rowtype; r public.found_mail_replies%rowtype; lock_sender text;
begin
  if p_token is null then raise exception 'Send token required'; end if;
  -- Shared order with found_mail_change: sender advisory, parent, reply.
  select from_address into lock_sender from public.found_mail_received where id=p_parent_id;
  if lock_sender is null then raise exception 'Message requires review before replying'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('found-mail/sender/'||coalesce(lock_sender,''),0));
  select * into m from public.found_mail_received where id=p_parent_id for update;
  if m.from_address is distinct from lock_sender then raise exception 'Sender changed. Refresh and review'; end if;
  if not found or m.processing_state<>'ready' or m.folder<>'inbox' or m.hard_blocked then raise exception 'Message requires review before replying'; end if;
  if exists(select 1 from public.found_mail_rules where sender_address=m.from_address and action='block') then raise exception 'Sender is blocked'; end if;
  select * into r from public.found_mail_replies where id=p_id and parent_id=p_parent_id for update;
  if not found then raise exception 'Draft not found'; end if;
  if r.status='sending' and (r.lease_until is null or r.lease_until<=now()) then
    update public.found_mail_replies set status='unconfirmed',last_error='Send confirmation was interrupted. Reconcile before sending again.',updated_at=now() where id=r.id;
    return null;
  end if;
  if r.status<>'draft' then return null; end if;
  if r.updated_at is distinct from p_expected_updated_at then raise exception 'Draft changed. Refresh and review it before sending'; end if;
  if r.to_address is distinct from p_to or p_to is distinct from coalesce(m.reply_to_address,m.from_address) or p_to in ('hello@foundco.app','support@foundco.app','shawn@foundco.app') then raise exception 'Reply recipient changed'; end if;
  if r.from_address is distinct from p_from or not public.found_mail_reply_from_allowed(m.to_addresses,p_from) then raise exception 'Unsupported sending address'; end if;
  update public.found_mail_replies set status='sending',lease_token=p_token,lease_until=now()+interval '2 minutes',updated_at=now() where id=r.id returning * into r;
  return to_jsonb(r);
end; $$;

-- Keep the old single-known-address RPC compatible. Ambiguous callers must
-- use reviewed From; never infer it from a draft or from an unknown address.
create or replace function public.found_mail_claim_reply(p_id uuid,p_parent_id uuid,p_to text,p_token uuid,p_expected_updated_at timestamptz)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare choices text[];
begin
  select array(select a from unnest(m.to_addresses) a where a in ('hello@foundco.app','support@foundco.app','shawn@foundco.app'))
    into choices from public.found_mail_received m where id=p_parent_id;
  if coalesce(cardinality(choices),0)<>1 then raise exception 'Choose an explicit approved From'; end if;
  return public.found_mail_claim_reply_reviewed(p_id,p_parent_id,p_to,choices[1],p_token,p_expected_updated_at);
end; $$;

create function public.found_mail_save_compose(p_reply_id uuid,p_to text,p_from text,p_subject text,p_body text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.found_mail_replies%rowtype;
begin
  if p_reply_id is null or p_to is null or p_to<>lower(btrim(p_to)) or length(p_to)>254
    or p_to !~ '^[a-z0-9.!#$%&''*+/=?^_{|}~-]+@[a-z0-9][a-z0-9.-]*[.][a-z]{2,63}$'
    or p_from is null or p_from not in ('hello@foundco.app','support@foundco.app','shawn@foundco.app')
    or p_subject is null or length(btrim(p_subject)) not between 1 and 500 or p_subject ~ '[[:cntrl:]]'
    or p_body is null or length(btrim(p_body)) not between 1 and 20000 then raise exception 'Invalid Compose draft'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('found-mail/sender/'||p_to,0));
  if exists(select 1 from public.found_mail_rules where sender_address=p_to and action='block') then raise exception 'Recipient is blocked'; end if;
  select * into r from public.found_mail_replies where id=p_reply_id for update;
  if found then
    if r.intent<>'compose' or r.parent_id is not null or r.status<>'draft' then raise exception 'Only an unsent Compose draft can be edited'; end if;
    update public.found_mail_replies set to_address=p_to,from_address=p_from,subject=p_subject,body_text=p_body,updated_at=now()
      where id=r.id returning * into r;
  else
    insert into public.found_mail_replies(id,parent_id,intent,to_address,from_address,subject,body_text,idempotency_key)
      values(p_reply_id,null,'compose',p_to,p_from,p_subject,p_body,'found-compose/'||p_reply_id::text) returning * into r;
  end if;
  return to_jsonb(r);
end; $$;

create function public.found_mail_claim_compose(p_id uuid,p_to text,p_from text,p_subject text,p_token uuid,p_expected_updated_at timestamptz)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.found_mail_replies%rowtype; recipient text;
begin
  if p_token is null then raise exception 'Send token required'; end if;
  select to_address into recipient from public.found_mail_replies where id=p_id and intent='compose' and parent_id is null;
  if not found then return null; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('found-mail/sender/'||recipient,0));
  select * into r from public.found_mail_replies where id=p_id for update;
  if not found or r.intent<>'compose' or r.parent_id is not null or r.to_address is distinct from recipient then raise exception 'Compose recipient changed'; end if;
  if r.status='sending' and (r.lease_until is null or r.lease_until<=now()) then
    update public.found_mail_replies set status='unconfirmed',last_error=coalesce(last_error,'Send confirmation was interrupted. Reconcile before sending again.'),updated_at=now() where id=r.id;
    return null;
  end if;
  if r.status<>'draft' then return null; end if;
  if r.to_address is distinct from p_to or r.from_address is distinct from p_from or r.subject is distinct from p_subject
    or r.updated_at is distinct from p_expected_updated_at then raise exception 'Reviewed Compose draft changed'; end if;
  if p_from is null or p_from not in ('hello@foundco.app','support@foundco.app','shawn@foundco.app') then raise exception 'Unsupported sending address'; end if;
  if exists(select 1 from public.found_mail_rules where sender_address=recipient and action='block') then raise exception 'Recipient is blocked'; end if;
  update public.found_mail_replies set status='sending',lease_token=p_token,lease_until=now()+interval '2 minutes',updated_at=now()
    where id=r.id returning * into r;
  return to_jsonb(r);
end; $$;

create or replace function public.found_mail_change(p_id uuid,p_action text,p_value text)
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
      and (r.parent_id=m.id or (r.intent='compose' and r.to_address=sender) or (sender is not null and exists(
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
    if exists(select 1 from public.found_mail_replies r left join public.found_mail_received other on other.id=r.parent_id
      where (other.from_address=sender or (r.intent='compose' and r.to_address=sender)) and r.status='sending') then
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

-- Keep durable receipt ordering and atomic Sent logging; only the intent tuple differs.
create or replace function public.found_mail_finish_reply(p_id uuid,p_token uuid,p_status text,p_provider_id text,p_error text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare r public.found_mail_replies%rowtype; receipt public.found_mail_delivery_receipts%rowtype;
begin
  if p_status not in ('accepted','failed','unconfirmed') then raise exception 'Invalid send result'; end if;
  if p_status='accepted' and coalesce(length(p_provider_id),0)=0 then raise exception 'Provider acceptance requires an ID'; end if;
  update public.found_mail_replies set status=p_status,provider_email_id=p_provider_id,
    last_error=left(p_error,500),lease_until=null,updated_at=now()
    where id=p_id and lease_token=p_token and status in ('sending','unconfirmed') returning * into r;
  if not found then return false; end if;
  if p_status='accepted' then
    select * into receipt from public.found_mail_delivery_receipts where provider_email_id=p_provider_id;
    if receipt.status='delivered' then update public.found_mail_replies set status='delivered' where id=p_id;
    elsif receipt.status in ('bounced','complained') then update public.found_mail_replies set status='failed',last_error='Provider reports '||receipt.status where id=p_id; end if;
    insert into public.email_log(company_id,lead_id,recipient_email,recipient_type,email_type,subject,text_body,success,source,email_scope,resend_email_id,delivery_status,delivery_status_at)
      select null,null,r.to_address,'prospect',case when r.intent='compose' then 'found_manual_compose' else 'found_manual_reply' end,r.subject,r.body_text,true,case when r.intent='compose' then 'admin/mail/manual-compose' else 'admin/mail/manual-reply' end,'found',p_provider_id,coalesce(receipt.status,'sent'),receipt.event_at
      where not exists(select 1 from public.email_log where resend_email_id=p_provider_id);
  end if;
  return true;
end; $$;

create or replace function public.found_mail_record_reply_delivery(p_provider_id text,p_status text,p_event_at timestamptz)
returns boolean language plpgsql security invoker set search_path='' as $$
declare current_status text; current_event_at timestamptz;
begin
  if coalesce(length(p_provider_id),0) not between 1 and 256 or p_status not in ('sent','delivered','delayed','bounced','complained') or p_event_at is null then raise exception 'Invalid delivery event'; end if;
  insert into public.found_mail_delivery_receipts(provider_email_id,status,event_at) values(p_provider_id,p_status,p_event_at)
    on conflict(provider_email_id) do update set status=excluded.status,event_at=excluded.event_at
      where excluded.event_at>=public.found_mail_delivery_receipts.event_at
        and not(public.found_mail_delivery_receipts.status in ('delivered','bounced','complained') and excluded.status in ('sent','delayed'));
  select status,event_at into current_status,current_event_at from public.found_mail_delivery_receipts where provider_email_id=p_provider_id;
  update public.found_mail_replies set status=case when current_status='delivered' then 'delivered' when current_status in ('bounced','complained') then 'failed' else 'accepted' end,
    last_error=case when current_status in ('bounced','complained') then 'Provider reports '||current_status else null end,updated_at=now()
    where provider_email_id=p_provider_id and status in ('accepted','delivered','failed','unconfirmed');
  insert into public.email_log(company_id,lead_id,recipient_email,recipient_type,email_type,subject,text_body,success,source,email_scope,resend_email_id,delivery_status,delivery_status_at)
    select null,null,r.to_address,'prospect',case when r.intent='compose' then 'found_manual_compose' else 'found_manual_reply' end,r.subject,r.body_text,true,case when r.intent='compose' then 'admin/mail/manual-compose' else 'admin/mail/manual-reply' end,'found',p_provider_id,current_status,current_event_at
      from public.found_mail_replies r where r.provider_email_id=p_provider_id
        and not exists(select 1 from public.email_log where resend_email_id=p_provider_id);
  update public.email_log set delivery_status=current_status,delivery_status_at=current_event_at
    where resend_email_id=p_provider_id and ((email_type='found_manual_reply' and source='admin/mail/manual-reply') or (email_type='found_manual_compose' and source='admin/mail/manual-compose'));
  return true;
end; $$;

revoke all on function public.found_mail_save_compose(uuid,text,text,text,text),
  public.found_mail_claim_compose(uuid,text,text,text,uuid,timestamptz),
  public.found_mail_claim_reply_reviewed(uuid,uuid,text,text,uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.found_mail_save_compose(uuid,text,text,text,text),
  public.found_mail_claim_compose(uuid,text,text,text,uuid,timestamptz),
  public.found_mail_claim_reply_reviewed(uuid,uuid,text,text,uuid,timestamptz) to service_role;
