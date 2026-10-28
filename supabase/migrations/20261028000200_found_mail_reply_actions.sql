-- Prepared locally only. Manual replies require separately enabled application gates.
create unique index found_mail_reply_provider_unique on public.found_mail_replies(provider_email_id) where provider_email_id is not null;
create table public.found_mail_delivery_receipts (
  provider_email_id text primary key,
  status text not null check(status in ('sent','delivered','delayed','bounced','complained')),
  event_at timestamptz not null
);
alter table public.found_mail_delivery_receipts enable row level security;
revoke all on public.found_mail_delivery_receipts from public,anon,authenticated;
grant select,insert,update,delete on public.found_mail_delivery_receipts to service_role;
create policy found_mail_delivery_service on public.found_mail_delivery_receipts to service_role using(true) with check(true);

create function public.found_mail_save_reply(p_parent_id uuid,p_reply_id uuid,p_body text,p_to text,p_from text,p_subject text)
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
  if p_to is distinct from coalesce(m.reply_to_address,m.from_address) or p_to in ('hello@foundco.app','support@foundco.app') then raise exception 'Reply recipient changed'; end if;
  if p_from not in ('hello@foundco.app','support@foundco.app') or not(p_from=any(m.to_addresses)) then raise exception 'Unsupported sending address'; end if;
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

create function public.found_mail_claim_reply(p_id uuid,p_parent_id uuid,p_to text,p_token uuid,p_expected_updated_at timestamptz)
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
  if r.to_address is distinct from p_to or p_to is distinct from coalesce(m.reply_to_address,m.from_address) then raise exception 'Reply recipient changed'; end if;
  if r.from_address not in ('hello@foundco.app','support@foundco.app') or not(r.from_address=any(m.to_addresses)) then raise exception 'Unsupported sending address'; end if;
  update public.found_mail_replies set status='sending',lease_token=p_token,lease_until=now()+interval '2 minutes',updated_at=now() where id=r.id returning * into r;
  return to_jsonb(r);
end; $$;

create function public.found_mail_finish_reply(p_id uuid,p_token uuid,p_status text,p_provider_id text,p_error text)
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
      select null,null,r.to_address,'prospect','found_manual_reply',r.subject,r.body_text,true,'admin/mail/manual-reply','found',p_provider_id,coalesce(receipt.status,'sent'),receipt.event_at
      where not exists(select 1 from public.email_log where resend_email_id=p_provider_id);
  end if;
  return true;
end; $$;

create function public.found_mail_record_reply_delivery(p_provider_id text,p_status text,p_event_at timestamptz)
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
    select null,null,r.to_address,'prospect','found_manual_reply',r.subject,r.body_text,true,'admin/mail/manual-reply','found',p_provider_id,current_status,current_event_at
      from public.found_mail_replies r where r.provider_email_id=p_provider_id
        and not exists(select 1 from public.email_log where resend_email_id=p_provider_id);
  update public.email_log set delivery_status=current_status,delivery_status_at=current_event_at
    where resend_email_id=p_provider_id and email_type='found_manual_reply' and source='admin/mail/manual-reply';
  return true;
end; $$;

revoke all on function public.found_mail_save_reply(uuid,uuid,text,text,text,text),public.found_mail_claim_reply(uuid,uuid,text,uuid,timestamptz),public.found_mail_finish_reply(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.found_mail_save_reply(uuid,uuid,text,text,text,text),public.found_mail_claim_reply(uuid,uuid,text,uuid,timestamptz),public.found_mail_finish_reply(uuid,uuid,text,text,text) to service_role;
revoke all on function public.found_mail_record_reply_delivery(text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.found_mail_record_reply_delivery(text,text,timestamptz) to service_role;
