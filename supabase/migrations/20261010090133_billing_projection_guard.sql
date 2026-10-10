-- Service grants use the same customer lease as billing observation.
create function public.billing_apply_projection(p_run uuid, p_token uuid, p_projection jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  r public.billing_reconciliation_runs;
  c public.companies;
  protection jsonb;
  item jsonb;
  changed boolean;
  activated boolean;
begin
  select * into r from public.billing_reconciliation_runs where id=p_run for update;
  if r.id is null or r.source<>'legacy_projection' or r.state<>'running'
    or r.lease_token is distinct from p_token or r.lease_until<=now() then raise exception 'Lost projection lease'; end if;
  select * into c from public.companies where id=r.company_id for update;
  if c.id is null or c.stripe_customer_id is distinct from r.customer_id then raise exception 'Projection customer mismatch'; end if;
  select facts into protection from public.billing_objects where account_scope='platform' and livemode=r.livemode
    and object_type='service_access_override' and object_id=c.id::text and company_id=c.id and customer_id=r.customer_id for update;
  if protection is not null then
    if jsonb_typeof(protection->'preserve_access')<>'boolean' then raise exception 'Invalid access override'; end if;
    if (protection->>'preserve_access')::boolean then
      update public.billing_reconciliation_runs set state='complete',finished_at=now(),
        checkpoint='{"applied":false,"protected":true}',completeness='{"full_ledger":false}' where id=p_run;
      return jsonb_build_object('applied',false,'protected',true,'activated',false);
    end if;
  end if;
  if p_projection->>'status' not in ('active','trialing') or p_projection->>'status' is null then
    raise exception 'Only verified active service grants can be projected';
  end if;
  if p_projection->>'plan' not in ('found','found_pro','found_business') or p_projection->>'plan' is null then
    raise exception 'Unrecognized service plan';
  end if;
  if nullif(p_projection->>'subscription_id','') is null then raise exception 'Subscription reference required'; end if;
  if jsonb_typeof(p_projection->'addon_items') is distinct from 'array' then raise exception 'Addon facts required'; end if;
  changed := c.plan is distinct from (p_projection->>'plan') or c.subscription_status is distinct from (p_projection->>'status');
  activated := c.subscription_status is null or c.subscription_status not in ('active','trialing');
  update public.companies set plan=p_projection->>'plan',subscription_status=p_projection->>'status',
    client_state=case when client_state='onboarding' and account_kind='client' then 'active' else client_state end where id=c.id;
  for item in select value from jsonb_array_elements(p_projection->'addon_items') loop
    if nullif(item->>'addon_slug','') is null or nullif(item->>'stripe_subscription_item_id','') is null then raise exception 'Incomplete addon facts'; end if;
    insert into public.addon_subscriptions(company_id,addon_slug,stripe_subscription_item_id,active)
      values(c.id,item->>'addon_slug',item->>'stripe_subscription_item_id',true)
      on conflict(company_id,addon_slug) do update set stripe_subscription_item_id=excluded.stripe_subscription_item_id,active=true;
  end loop;
  update public.addon_subscriptions set active=false where company_id=c.id and active=true
    and addon_slug not in(select value->>'addon_slug' from jsonb_array_elements(p_projection->'addon_items'));
  if changed then
    insert into public.client_activities(company_id,activity_type,summary,metadata)
      values(c.id,'billing','Verified active Stripe subscription projected under customer lease.',
        jsonb_build_object('event_type','stripe_subscription_projected','source','stripe_webhook',
          'old_plan',c.plan,'new_plan',p_projection->>'plan','old_subscription_status',c.subscription_status,
          'new_subscription_status',p_projection->>'status','stripe_customer_id',r.customer_id,
          'stripe_subscription_id',p_projection->>'subscription_id'));
  end if;
  update public.billing_reconciliation_runs set state='complete',finished_at=now(),
    checkpoint=jsonb_build_object('applied',true,'subscription_id',p_projection->>'subscription_id'),
    completeness='{"full_ledger":false}',error=null where id=p_run;
  return jsonb_build_object('applied',true,'protected',false,'activated',activated);
end $$;
revoke all on function public.billing_apply_projection(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.billing_apply_projection(uuid,uuid,jsonb) to service_role;
