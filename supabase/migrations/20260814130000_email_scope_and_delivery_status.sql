-- Team-approved (Steve leading, 2026-08-14): split email_log into Found's own
-- email vs. client-business email, and track real delivery/bounce status via
-- the Resend webhook instead of only knowing "did the API call succeed."

alter table email_log
  add column if not exists email_scope text not null default 'client'
    check (email_scope in ('client', 'found')),
  add column if not exists resend_email_id text,
  add column if not exists delivery_status text,
  add column if not exists delivery_status_at timestamptz;

create index if not exists email_log_resend_email_id_idx on email_log (resend_email_id);
create index if not exists email_log_scope_idx on email_log (email_scope);
