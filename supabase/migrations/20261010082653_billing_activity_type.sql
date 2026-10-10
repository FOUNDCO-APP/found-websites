-- Billing audit code writes 'billing'; retain every existing permitted activity type.
do $$
declare
  existing_predicate text;
begin
  lock table public.client_activities in access exclusive mode;
  select pg_get_expr(conbin, conrelid)
    into existing_predicate
    from pg_constraint
    where conrelid = 'public.client_activities'::regclass
      and conname = 'client_activities_activity_type_check'
      and contype = 'c';
  if existing_predicate is null then
    raise exception 'Expected activity-type constraint is missing; inspect schema before repair';
  end if;
  alter table public.client_activities drop constraint client_activities_activity_type_check;
  execute format(
    'alter table public.client_activities add constraint client_activities_activity_type_check check ((%s) or activity_type = %L)',
    existing_predicate, 'billing'
  );
end $$;
