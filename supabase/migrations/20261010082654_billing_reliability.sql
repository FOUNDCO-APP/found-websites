-- Service-role workers own all billing reliability data.
create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  account_scope text not null default 'platform', livemode boolean not null,
  event_id text not null, event_type text not null, customer_id text,
  payload jsonb not null, received_at timestamptz not null default now(),
  state text not null default 'pending' check (state in ('pending','processing','complete','failed')),
  attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
  lease_token uuid, lease_until timestamptz, error text,
  unique (account_scope, livemode, event_id)
);
create table public.billing_invoices (
  id text not null, account_scope text not null default 'platform', livemode boolean not null,
  company_id uuid not null references public.companies(id), customer_id text not null,
  subscription_id text, status text, currency text not null,
  total bigint not null, amount_due bigint not null, amount_paid bigint not null, amount_remaining bigint not null,
  paid_at timestamptz, next_payment_attempt timestamptz,
  facts jsonb not null, verified_at timestamptz not null,
  primary key (account_scope, livemode, id)
);
create table public.billing_objects (
  account_scope text not null default 'platform', livemode boolean not null,
  object_type text not null, object_id text not null,
  company_id uuid not null references public.companies(id), customer_id text not null,
  facts jsonb not null, verified_at timestamptz not null,
  primary key (account_scope, livemode, object_type, object_id)
);
create table public.billing_incidents (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
  livemode boolean not null, invoice_id text not null, kind text not null,
  origin text not null check (origin in ('historical','live')),
  first_observed_at timestamptz not null default now(), first_failure_at timestamptz,
  verified_at timestamptz not null, resolved_at timestamptz,
  acknowledged_at timestamptz, acknowledged_by text,
  unique (livemode, invoice_id, kind)
);
create table public.billing_notification_jobs (
  id uuid primary key default gen_random_uuid(), incident_id uuid not null references public.billing_incidents(id),
  company_id uuid not null references public.companies(id), dedupe_key text not null unique,
  recipient_type text not null check (recipient_type in ('admin','client_owner')),
  recipient text not null, subject text not null, text_body text not null,
  state text not null default 'pending' check (state in ('pending','processing','accepted','failed','unknown','suppressed')),
  attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
  first_attempt_at timestamptz, lease_token uuid, lease_until timestamptz,
  resend_email_id text, email_log_id uuid, error text, created_at timestamptz not null default now()
);
create table public.billing_reconciliation_runs (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
  customer_id text not null, livemode boolean not null,
  source text not null, state text not null default 'running' check (state in ('running','complete','failed')),
  started_at timestamptz not null default now(), finished_at timestamptz,
  lease_token uuid not null, lease_until timestamptz not null,
  completeness jsonb not null default '{}', checkpoint jsonb not null default '{}', error text
);
create unique index billing_customer_running on public.billing_reconciliation_runs(customer_id,livemode) where state = 'running';
create index billing_events_due on public.billing_events(next_attempt_at) where state <> 'complete';
create index billing_jobs_due on public.billing_notification_jobs(next_attempt_at) where state in ('pending','failed','processing');
create index billing_invoice_company on public.billing_invoices(company_id,verified_at);

do $$ declare t text; begin
  foreach t in array array['billing_events','billing_invoices','billing_objects','billing_incidents','billing_notification_jobs','billing_reconciliation_runs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end $$;

create function public.billing_claim_work(p_kind text, p_token uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result jsonb;
begin
  if p_token is null then raise exception 'Worker token required'; end if;
  if p_kind = 'event' then
    with candidate as (
      select id from public.billing_events where
        (state in ('pending','failed') and next_attempt_at <= now()) or
        (state = 'processing' and lease_until < now())
      order by received_at for update skip locked limit 1
    ), claimed as (
      update public.billing_events e set state='processing', lease_token=p_token,
        lease_until=now()+interval '5 minutes', attempts=attempts+1
      from candidate c where e.id=c.id returning e.*
    ) select to_jsonb(claimed) into result from claimed;
  elsif p_kind = 'notification' then
    -- Provider deduplication expires after 24h. Ambiguous older sends need review.
    update public.billing_notification_jobs set state='unknown', error='Provider acceptance requires review'
    where state in ('processing','failed') and first_attempt_at < now()-interval '23 hours'
      and (lease_until is null or lease_until < now());
    with candidate as (
      select id from public.billing_notification_jobs where
        (state in ('pending','failed') and next_attempt_at <= now()) or
        (state='processing' and lease_until < now())
      order by created_at for update skip locked limit 1
    ), claimed as (
      update public.billing_notification_jobs j set state='processing', lease_token=p_token,
        lease_until=now()+interval '5 minutes', attempts=attempts+1,
        first_attempt_at=coalesce(first_attempt_at,now())
      from candidate c where j.id=c.id returning j.*
    ) select to_jsonb(claimed) into result from claimed;
  else raise exception 'Invalid work kind'; end if;
  return result;
end $$;

create function public.billing_start_run(p_company uuid,p_customer text,p_live boolean,p_source text,p_token uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare run_id uuid;
begin
  if p_token is null then raise exception 'Worker token required'; end if;
  if not exists(select 1 from public.companies where id=p_company and stripe_customer_id=p_customer) then
    raise exception 'Billing customer scope mismatch';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_customer || p_live::text,0));
  update public.billing_reconciliation_runs set state='failed',finished_at=now(),error='Worker lease expired'
    where customer_id=p_customer and livemode=p_live and state='running' and lease_until<now();
  if exists(select 1 from public.billing_reconciliation_runs where customer_id=p_customer and livemode=p_live and state='running') then return null; end if;
  insert into public.billing_reconciliation_runs(company_id,customer_id,livemode,source,lease_token,lease_until)
    values(p_company,p_customer,p_live,p_source,p_token,now()+interval '5 minutes') returning id into run_id;
  return run_id;
end $$;

create function public.billing_commit_facts(p_run uuid,p_token uuid,p_event uuid,p_event_token uuid,p_facts jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare r public.billing_reconciliation_runs; v jsonb; incident uuid; j jsonb;
begin
  select * into r from public.billing_reconciliation_runs where id=p_run for update;
  if r.id is null or r.state<>'running' or r.lease_token is distinct from p_token or r.lease_until<=now() then raise exception 'Lost customer lease'; end if;
  if p_event is not null then
    perform 1 from public.billing_events where id=p_event and state='processing' and lease_token=p_event_token and lease_until>now() for update;
    if not found then raise exception 'Lost event lease'; end if;
  end if;
  if p_facts->>'origin' not in ('historical','live') or p_facts->>'origin' is null then raise exception 'Explicit origin required'; end if;
  if p_facts->>'origin' = 'live' and not exists (
    select 1 from public.billing_reconciliation_runs b where b.company_id=r.company_id and b.livemode=r.livemode
      and b.source='daily' and b.state='complete' and b.completeness->>'full_ledger'='true'
      and (p_event is null or b.finished_at < to_timestamp((select (payload->>'created')::double precision from public.billing_events where id=p_event)))
  ) then raise exception 'Live observation requires completed baseline and newer event'; end if;
  for v in select value from jsonb_array_elements(p_facts->'invoices') loop
    if exists(select 1 from public.billing_invoices where account_scope='platform' and livemode=r.livemode and id=v->>'id'
      and (company_id<>r.company_id or customer_id<>r.customer_id)) then raise exception 'Invoice ownership mismatch'; end if;
    insert into public.billing_invoices(id,livemode,company_id,customer_id,subscription_id,status,currency,total,amount_due,amount_paid,amount_remaining,paid_at,next_payment_attempt,facts,verified_at)
    values(v->>'id',r.livemode,r.company_id,r.customer_id,v->>'subscription_id',v->>'status',v->>'currency',
      (v->>'total')::bigint,(v->>'amount_due')::bigint,(v->>'amount_paid')::bigint,(v->>'amount_remaining')::bigint,
      (v->>'paid_at')::timestamptz,(v->>'next_payment_attempt')::timestamptz,v,now())
    on conflict(account_scope,livemode,id) do update set status=excluded.status,total=excluded.total,amount_due=excluded.amount_due,
      amount_paid=excluded.amount_paid,amount_remaining=excluded.amount_remaining,paid_at=excluded.paid_at,
      next_payment_attempt=excluded.next_payment_attempt,facts=excluded.facts,verified_at=excluded.verified_at;
    if (v->>'amount_remaining')::bigint > 0 and (v->>'failure_kind') is not null then
      insert into public.billing_incidents(company_id,livemode,invoice_id,kind,origin,first_failure_at,verified_at)
      values(r.company_id,r.livemode,v->>'id',v->>'failure_kind',p_facts->>'origin',
        (v->>'first_failure_at')::timestamptz,now())
      on conflict(livemode,invoice_id,kind) do update set verified_at=now(),resolved_at=null returning id into incident;
      if p_facts->>'origin' = 'live' and exists(select 1 from public.billing_incidents where id=incident and origin='live') then
        for j in select value from jsonb_array_elements(coalesce(v->'notifications','[]'::jsonb)) loop
          insert into public.billing_notification_jobs(incident_id,company_id,dedupe_key,recipient_type,recipient,subject,text_body)
          values(incident,r.company_id,incident::text || ':' || (v->>'failure_kind') || ':email:' || (j->>'recipient_type') || ':' || lower(j->>'recipient'),j->>'recipient_type',j->>'recipient',j->>'subject',j->>'text_body')
          on conflict(dedupe_key) do nothing;
        end loop;
      end if;
    elsif v->>'status' in ('paid','void') or (v->>'amount_remaining')::bigint=0 then
      update public.billing_incidents set resolved_at=coalesce(resolved_at,now()),verified_at=now()
        where livemode=r.livemode and invoice_id=v->>'id';
      update public.billing_notification_jobs set state='suppressed' where state in ('pending','failed')
        and incident_id in(select id from public.billing_incidents where livemode=r.livemode and invoice_id=v->>'id');
    end if;
  end loop;
  for v in select value from jsonb_array_elements(p_facts->'objects') loop
    if exists(select 1 from public.billing_objects where account_scope='platform' and livemode=r.livemode
      and object_type=v->>'object_type' and object_id=v->>'object_id'
      and (company_id<>r.company_id or customer_id<>r.customer_id)) then raise exception 'Billing object ownership mismatch'; end if;
    insert into public.billing_objects(livemode,object_type,object_id,company_id,customer_id,facts,verified_at)
      values(r.livemode,v->>'object_type',v->>'object_id',r.company_id,r.customer_id,v->'facts',now())
    on conflict(account_scope,livemode,object_type,object_id) do update set facts=excluded.facts,verified_at=excluded.verified_at;
  end loop;
  update public.billing_reconciliation_runs set state='complete',finished_at=now(),completeness=p_facts->'completeness' where id=p_run;
  if p_event is not null then update public.billing_events set state='complete',lease_until=null,error=null where id=p_event; end if;
end $$;

revoke all on function public.billing_claim_work(text,uuid),public.billing_start_run(uuid,text,boolean,text,uuid),public.billing_commit_facts(uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.billing_claim_work(text,uuid),public.billing_start_run(uuid,text,boolean,text,uuid),public.billing_commit_facts(uuid,uuid,uuid,uuid,jsonb) to service_role;
