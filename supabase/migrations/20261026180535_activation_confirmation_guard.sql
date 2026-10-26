create table public.activation_attempts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  customer_id text not null,
  setup_intent_id text not null,
  livemode boolean not null,
  state text not null default 'pending' check (state in ('pending', 'completed')),
  request_params jsonb,
  expected_company jsonb,
  company_result jsonb,
  first_dispatched_at timestamptz,
  stripe_subscription_id text,
  lease_token uuid,
  lease_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (livemode, setup_intent_id),
  check (state <> 'completed' or stripe_subscription_id is not null)
);
create unique index activation_attempts_one_pending_company
  on public.activation_attempts(company_id, livemode) where state = 'pending';
alter table public.activation_attempts enable row level security;
revoke all on public.activation_attempts from public, anon, authenticated;
grant select, insert, update on public.activation_attempts to service_role;
create policy activation_attempts_service_only on public.activation_attempts
  for all to service_role using (true) with check (true);

-- The company lock serializes distinct payment attempts, not just double clicks.
create function public.claim_activation_attempt(
  p_company uuid, p_customer text, p_intent text, p_live boolean, p_token uuid
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  c public.companies%rowtype;
  a public.activation_attempts%rowtype;
begin
  if p_token is null or p_live is null or nullif(p_intent,'') is null then
    raise exception 'Invalid activation claim';
  end if;
  select * into c from public.companies where id = p_company for update;
  if not found or c.retired_at is not null or c.stripe_customer_id is distinct from p_customer then
    raise exception 'Activation company mapping changed';
  end if;
  select * into a from public.activation_attempts
    where livemode = p_live and setup_intent_id = p_intent for update;
  if found then
    if a.company_id <> p_company or a.customer_id <> p_customer then
      raise exception 'Activation attempt mapping mismatch';
    end if;
    if a.lease_until > now() then return null; end if;
  else
    if exists (select 1 from public.activation_attempts
      where company_id = p_company and livemode = p_live and state = 'pending') then
      return null;
    end if;
    if split_part(coalesce(c.pending_setup_intent_secret, ''), '_secret_', 1) <> p_intent
      and coalesce(c.subscription_status, '') not in ('active', 'trialing') then
      raise exception 'Activation intent is no longer current';
    end if;
    insert into public.activation_attempts(company_id, customer_id, setup_intent_id, livemode, expected_company)
      values (p_company, p_customer, p_intent, p_live,
        jsonb_build_object('plan',c.plan,'subscription_status',c.subscription_status)) returning * into a;
  end if;
  update public.activation_attempts set lease_token = p_token,
    lease_until = now() + interval '10 minutes', updated_at = now()
    where id = a.id returning * into a;
  return to_jsonb(a);
end;
$$;
revoke all on function public.claim_activation_attempt(uuid,text,text,boolean,uuid)
  from public, anon, authenticated;
grant execute on function public.claim_activation_attempt(uuid,text,text,boolean,uuid)
  to service_role;

-- A signed webhook can record the same Stripe result even after a browser timeout.
create function public.note_activation_subscription(
  p_attempt uuid, p_company uuid, p_customer text, p_live boolean, p_subscription text
) returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  update public.activation_attempts set stripe_subscription_id = p_subscription, updated_at = now()
    where id = p_attempt and company_id = p_company and customer_id = p_customer
      and livemode = p_live
      and (stripe_subscription_id is null or stripe_subscription_id = p_subscription);
  return found;
end;
$$;
revoke all on function public.note_activation_subscription(uuid,uuid,text,boolean,text)
  from public, anon, authenticated;
grant execute on function public.note_activation_subscription(uuid,uuid,text,boolean,text)
  to service_role;

create function public.complete_activation_attempt(
  p_attempt uuid, p_token uuid, p_subscription text, p_update jsonb default null
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  a public.activation_attempts%rowtype;
  c public.companies%rowtype;
  field text;
begin
  select * into a from public.activation_attempts where id = p_attempt;
  if not found then raise exception 'Missing activation attempt'; end if;
  select * into c from public.companies where id = a.company_id for update;
  select * into a from public.activation_attempts where id = p_attempt for update;
  if c.retired_at is not null or c.stripe_customer_id is distinct from a.customer_id
    or p_token is null or a.lease_token is distinct from p_token
    or a.lease_until is null or a.lease_until <= now()
    or a.stripe_subscription_id is distinct from p_subscription then
    raise exception 'Activation completion mapping or lease changed';
  end if;
  if p_update is not null then
    if c.plan is distinct from a.expected_company->>'plan'
      and c.plan is distinct from p_update->>'plan' then
      raise exception 'Company plan changed after activation began';
    end if;
    if p_update->>'subscription_status' is null or p_update->>'plan' is null
      or p_update->>'subscription_status' not in ('active','trialing')
      or p_update->>'plan' not in ('found','found_pro','found_business') then
      raise exception 'Invalid activation result';
    end if;
    update public.companies set subscription_status = p_update->>'subscription_status',
      plan = p_update->>'plan', pending_setup_intent_secret = null,
      is_founding_member = case when p_update ? 'is_founding_member'
        then (p_update->>'is_founding_member')::boolean else is_founding_member end,
      trial_ends_at = case when p_update ? 'trial_ends_at'
        then (p_update->>'trial_ends_at')::timestamptz else trial_ends_at end
      where id = a.company_id;
    -- Older databases lack these optional audit columns; the complete result is
    -- always retained in the protected attempt even when no legacy column exists.
    foreach field in array array['applied_promotion_code_id','applied_promotion_code',
      'applied_coupon_id','applied_discount_label'] loop
      if p_update ? field and exists (select 1 from information_schema.columns
        where table_schema='public' and table_name='companies' and column_name=field) then
        execute format('update public.companies set %I = $1 where id = $2', field)
          using p_update->>field, a.company_id;
      end if;
    end loop;
  end if;
  update public.activation_attempts set state = 'completed', updated_at = now(),
    company_result = coalesce(p_update,company_result),
    lease_token = null, lease_until = null where id = a.id;
  return true;
end;
$$;
revoke all on function public.complete_activation_attempt(uuid,uuid,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.complete_activation_attempt(uuid,uuid,text,jsonb)
  to service_role;

-- Setup creation uses the same company lock and a compare-and-swap snapshot, so
-- an older browser response cannot replace a customer/plan after activation.
create function public.save_activation_setup(
  p_company uuid, p_customer text, p_pending text, p_status text, p_update jsonb
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare c public.companies%rowtype;
begin
  if p_update is null or jsonb_typeof(p_update) <> 'object'
    or jsonb_typeof(p_update->'stripe_customer_id') is distinct from 'string'
    or nullif(p_update->>'stripe_customer_id','') is null
    or (p_update ? 'plan' and (p_update->>'plan' is null
      or p_update->>'plan' not in ('found','found_pro','found_business'))) then
    raise exception 'Invalid activation setup result';
  end if;
  select * into c from public.companies where id=p_company for update;
  if not found or c.retired_at is not null
    or coalesce(c.subscription_status,'') in ('active','trialing')
    or c.stripe_customer_id is distinct from p_customer
    or c.pending_setup_intent_secret is distinct from p_pending
    or c.subscription_status is distinct from p_status
    or exists (select 1 from public.activation_attempts where company_id=p_company and state='pending') then
    return false;
  end if;
  update public.companies set stripe_customer_id=p_update->>'stripe_customer_id',
    pending_setup_intent_secret=case when p_update ? 'pending_setup_intent_secret'
      then p_update->>'pending_setup_intent_secret' else pending_setup_intent_secret end,
    plan=case when p_update ? 'plan' then p_update->>'plan' else plan end,
    trial_ends_at=case when p_update ? 'trial_ends_at'
      then (p_update->>'trial_ends_at')::timestamptz else trial_ends_at end
    where id=p_company;
  return true;
end;
$$;
revoke all on function public.save_activation_setup(uuid,text,text,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.save_activation_setup(uuid,text,text,text,jsonb)
  to service_role;
