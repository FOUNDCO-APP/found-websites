-- Team-approved (Priya leading, 2026-08-14): deferred-billing clients need a
-- real target billing day (not just "N days from now"), and the admin tool
-- needs a structured place to record cash/check already collected instead of
-- burying it in a free-text note.
alter table companies
  add column if not exists billing_cycle_day integer
    check (billing_cycle_day is null or (billing_cycle_day >= 1 and billing_cycle_day <= 28)),
  add column if not exists deferred_payment_amount numeric(10,2),
  add column if not exists deferred_payment_method text
    check (deferred_payment_method is null or deferred_payment_method in ('cash', 'check', 'other')),
  add column if not exists deferred_payment_note text;
