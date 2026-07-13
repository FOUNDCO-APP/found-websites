begin;

alter table public.companies
  add column if not exists preview_completed_at timestamptz,
  add column if not exists activation_reminder_sent_at timestamptz,
  add column if not exists site_live_email_sent_at timestamptz;

commit;