-- Appended to a schema-remapped migration inside a transaction that rolls back.
insert into billing_verify.companies(id, stripe_customer_id)
values ('00000000-0000-4000-8000-000000000001', 'cus_fixture');
insert into billing_verify.companies(id, stripe_customer_id)
values ('00000000-0000-4000-8000-000000000002', 'cus_other');

do $$
declare
  company uuid := '00000000-0000-4000-8000-000000000001';
  token_a uuid := gen_random_uuid();
  token_b uuid := gen_random_uuid();
  run_id uuid;
  work jsonb;
  failed boolean;
  facts jsonb;
begin
  insert into billing_verify.billing_events(livemode,event_id,event_type,customer_id,payload)
    values(true,'evt_fixture','invoice.payment_failed','cus_fixture',
      jsonb_build_object('created',extract(epoch from clock_timestamp()+interval '1 minute')::bigint));
  insert into billing_verify.billing_events(livemode,event_id,event_type,payload)
    values(true,'evt_fixture','invoice.payment_failed','{}') on conflict do nothing;
  if (select count(*) from billing_verify.billing_events) <> 1 then raise exception 'Duplicate event accepted'; end if;
  work := billing_verify.billing_claim_work('event',token_a);
  if work->>'state' <> 'processing' then raise exception 'Event not claimed'; end if;
  if billing_verify.billing_claim_work('event',token_b) is not null then raise exception 'Active event lease stolen'; end if;

  run_id := billing_verify.billing_start_run(company,'cus_fixture',true,'daily',token_a);
  if billing_verify.billing_start_run(company,'cus_fixture',true,'daily',token_b) is not null then raise exception 'Concurrent customer run accepted'; end if;
  facts := jsonb_build_object('origin','historical','completeness',jsonb_build_object('full_ledger',true),
    'objects','[]'::jsonb,'invoices',jsonb_build_array(jsonb_build_object(
      'id','in_old','status','open','currency','usd','total',3900,'amount_due',3900,'amount_paid',0,'amount_remaining',3900,
      'failure_kind','payment_failed','notifications',jsonb_build_array(jsonb_build_object('recipient_type','admin','recipient','owner@example.invalid','subject','Fixture','text_body','Fixture')))));
  perform billing_verify.billing_commit_facts(run_id,token_a,null,null,facts);
  if exists(select 1 from billing_verify.billing_notification_jobs) then raise exception 'Historical baseline queued notice'; end if;

  run_id := billing_verify.billing_start_run(company,'cus_fixture',true,'event',token_a);
  facts := jsonb_build_object('origin','live','completeness','{}'::jsonb,'objects','[]'::jsonb,
    'invoices',jsonb_build_array(jsonb_build_object('id','in_new','status','open','currency','usd',
      'total',6900,'amount_due',6900,'amount_paid',0,'amount_remaining',6900,'failure_kind','payment_failed',
      'notifications',jsonb_build_array(jsonb_build_object('recipient_type','admin','recipient','owner@example.invalid','subject','Fixture','text_body','Fixture')))));
  perform billing_verify.billing_commit_facts(run_id,token_a,(work->>'id')::uuid,token_a,facts);
  if (select count(*) from billing_verify.billing_notification_jobs) <> 1 then raise exception 'Live notice missing'; end if;

  run_id := billing_verify.billing_start_run(company,'cus_fixture',true,'daily',token_b);
  perform billing_verify.billing_commit_facts(run_id,token_b,null,null,facts);
  if (select count(*) from billing_verify.billing_notification_jobs) <> 1 then raise exception 'Duplicate notice queued'; end if;

  run_id := billing_verify.billing_start_run(company,'cus_fixture',true,'daily',token_a);
  failed := false;
  begin
    perform billing_verify.billing_commit_facts(run_id,token_b,null,null,facts);
  exception when others then
    if sqlerrm not like '%Lost customer lease%' then raise; end if;
    failed := true;
  end;
  if not failed then raise exception 'Wrong lease committed'; end if;
  failed := false;
  begin
    perform billing_verify.billing_commit_facts(run_id,null,null,null,facts);
  exception when others then
    if sqlerrm not like '%Lost customer lease%' then raise; end if;
    failed := true;
  end;
  if not failed then raise exception 'Null worker token committed'; end if;

  failed := false;
  begin
    perform billing_verify.billing_commit_facts(run_id,token_a,null,null,
      jsonb_build_object('origin','live','objects','[]'::jsonb,'completeness','{}'::jsonb,'invoices',
        jsonb_build_array(jsonb_build_object('id','in_new','status','paid','currency','usd','total',6900,'amount_due',6900,'amount_paid',6900,'amount_remaining',0),
          jsonb_build_object('id','in_bad','status','open','currency','usd','total',null,'amount_due',1,'amount_paid',0,'amount_remaining',1))));
  exception when not_null_violation then failed := true;
  end;
  if not failed then raise exception 'Invalid facts accepted'; end if;
  if (select amount_remaining from billing_verify.billing_invoices where id='in_new') <> 6900 then raise exception 'Partial commit leaked'; end if;
  if (select state from billing_verify.billing_reconciliation_runs where id=run_id) <> 'running' then raise exception 'Failed run completed'; end if;

  perform billing_verify.billing_commit_facts(run_id,token_a,null,null,
    jsonb_build_object('origin','live','objects','[]'::jsonb,'completeness','{}'::jsonb,'invoices',
      jsonb_build_array(jsonb_build_object('id','in_new','status','paid','currency','usd','total',6900,'amount_due',6900,'amount_paid',6900,'amount_remaining',0))));
  if (select amount_remaining from billing_verify.billing_invoices where id='in_old') <> 3900 then raise exception 'New payment cleared older debt'; end if;
  if (select state from billing_verify.billing_notification_jobs limit 1) <> 'suppressed' then raise exception 'Paid notice not suppressed'; end if;

  failed := false;
  begin
    perform billing_verify.billing_start_run(company,'cus_other',true,'daily',token_a);
  exception when others then
    if sqlerrm not like '%customer scope mismatch%' then raise; end if;
    failed := true;
  end;
  if not failed then raise exception 'Wrong customer accepted'; end if;
  run_id := billing_verify.billing_start_run('00000000-0000-4000-8000-000000000002','cus_other',true,'daily',token_a);
  failed := false;
  begin
    perform billing_verify.billing_commit_facts(run_id,token_a,null,null,
      jsonb_build_object('origin','historical','objects','[]'::jsonb,'completeness','{}'::jsonb,'invoices',
        jsonb_build_array(jsonb_build_object('id','in_old','status','paid','currency','usd','total',3900,'amount_due',3900,'amount_paid',3900,'amount_remaining',0))));
  exception when others then
    if sqlerrm not like '%Invoice ownership mismatch%' then raise; end if;
    failed := true;
  end;
  if not failed then raise exception 'Cross-company invoice overwritten'; end if;

  insert into billing_verify.billing_events(livemode,event_id,event_type,payload)
    values(true,'evt_crash','invoice.updated','{}');
  work := billing_verify.billing_claim_work('event',token_a);
  update billing_verify.billing_events set lease_until=now()-interval '1 second' where id=(work->>'id')::uuid;
  work := billing_verify.billing_claim_work('event',token_b);
  if (work->>'attempts')::int <> 2 or work->>'lease_token' <> token_b::text then raise exception 'Expired lease not recovered'; end if;

  if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='billing_verify' and c.relname like 'billing_%' and c.relkind='r' and c.relrowsecurity) <> 6 then raise exception 'RLS missing'; end if;
  if has_table_privilege('anon','billing_verify.billing_invoices','select') or has_table_privilege('authenticated','billing_verify.billing_invoices','select') then raise exception 'Client billing data exposed'; end if;
  if has_function_privilege('anon','billing_verify.billing_claim_work(text,uuid)','execute') or has_function_privilege('authenticated','billing_verify.billing_claim_work(text,uuid)','execute') then raise exception 'Worker function exposed'; end if;
end $$;
select 'passed: deduplication, leases, atomic rollback, historical suppression, outstanding-debt preservation, paid-notice suppression, recovery and RLS' as result;
rollback;
