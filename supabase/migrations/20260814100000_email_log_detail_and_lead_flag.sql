alter table public.email_log
  add column if not exists html text,
  add column if not exists text_body text,
  add column if not exists lead_id uuid references public.leads(id) on delete set null;

create index if not exists email_log_lead_id_idx on public.email_log (lead_id);

alter table public.leads
  add column if not exists flagged boolean not null default false,
  add column if not exists flag_note text;

create index if not exists leads_flagged_idx on public.leads (flagged) where flagged = true;
