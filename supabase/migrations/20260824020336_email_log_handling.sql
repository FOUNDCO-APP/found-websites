alter table public.email_log
  add column if not exists handled_at timestamptz,
  add column if not exists handled_note text;

create index if not exists email_log_handled_at_idx on public.email_log (handled_at);
create index if not exists email_log_needs_handling_idx on public.email_log (created_at desc)
  where handled_at is null;
