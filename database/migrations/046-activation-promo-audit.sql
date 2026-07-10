begin;

alter table public.companies
  add column if not exists applied_promotion_code_id text,
  add column if not exists applied_promotion_code text,
  add column if not exists applied_coupon_id text,
  add column if not exists applied_discount_label text;

commit;
