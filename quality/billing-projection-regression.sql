do $$
declare
  company uuid := '00000000-0000-4000-8000-000000000001';
  token uuid := gen_random_uuid();
  run_id uuid;
  result jsonb;
  failed boolean;
begin
  update billing_verify.companies set plan='found_pro',subscription_status='active',client_state='onboarding',account_kind='client' where id=company;
  insert into billing_verify.billing_objects(livemode,object_type,object_id,company_id,customer_id,facts,verified_at)
    values(true,'service_access_override',company::text,company,'cus_fixture','{"preserve_access":true}',now());
  run_id := billing_verify.billing_start_run(company,'cus_fixture',true,'legacy_projection',token);
  result := billing_verify.billing_apply_projection(run_id,token,
    '{"status":"active","plan":"found_business","subscription_id":"sub_fixture","addon_items":[{"addon_slug":"email_marketing","stripe_subscription_item_id":"si_fixture"}]}');
  if result->>'protected'<>'true' then raise exception 'Protected projection applied'; end if;
  if (select plan from billing_verify.companies where id=company)<>'found_pro' or exists(select 1 from billing_verify.addon_subscriptions) then raise exception 'Protected access changed'; end if;

  update billing_verify.billing_objects set facts='{"preserve_access":false}' where object_type='service_access_override';
  insert into billing_verify.addon_subscriptions(company_id,addon_slug,stripe_subscription_item_id,active)
    values(company,'old_addon','si_old',true);
  run_id := billing_verify.billing_start_run(company,'cus_fixture',true,'legacy_projection',token);
  result := billing_verify.billing_apply_projection(run_id,token,
    '{"status":"active","plan":"found_business","subscription_id":"sub_fixture","addon_items":[{"addon_slug":"email_marketing","stripe_subscription_item_id":"si_fixture"}]}');
  if result->>'applied'<>'true' or (select plan from billing_verify.companies where id=company)<>'found_business' then raise exception 'Valid active grant missing'; end if;
  if (select active from billing_verify.addon_subscriptions where addon_slug='old_addon') or not (select active from billing_verify.addon_subscriptions where addon_slug='email_marketing') then raise exception 'Addon grant projection incorrect'; end if;
  if (select count(*) from billing_verify.client_activities where activity_type='billing') <> 1 then raise exception 'Projection audit missing'; end if;

  run_id := billing_verify.billing_start_run(company,'cus_fixture',true,'legacy_projection',token);
  failed := false;
  begin
    perform billing_verify.billing_apply_projection(run_id,null,'{"status":"active","plan":"found_pro","subscription_id":"sub_fixture","addon_items":[]}');
  exception when others then
    if sqlerrm not like '%Lost projection lease%' then raise; end if;
    failed := true;
  end;
  if not failed then raise exception 'Null projection lease accepted'; end if;
  failed := false;
  begin
    perform billing_verify.billing_apply_projection(run_id,token,'{"status":"active","plan":"found_pro","subscription_id":"sub_fixture","addon_items":[{"addon_slug":"bad"}]}');
  exception when others then
    if sqlerrm not like '%Incomplete addon facts%' then raise; end if;
    failed := true;
  end;
  if not failed or (select plan from billing_verify.companies where id=company)<>'found_business' then raise exception 'Partial projection leaked'; end if;
  failed := false;
  begin
    perform billing_verify.billing_apply_projection(run_id,token,'{"status":"canceled","plan":"found_pro","subscription_id":"sub_fixture","addon_items":[]}');
  exception when others then
    if sqlerrm not like '%Only verified active service grants%' then raise; end if;
    failed := true;
  end;
  if not failed then raise exception 'Financial cancellation removed service'; end if;
end $$;
select 'passed: protected access, active grants, atomic addon rollback, audit, lost lease and cancellation restriction' as projection_result;
rollback;
