-- Only trusted server actions may call this: owner guard or verified admin guard.
-- Share the company-row lock with select_pro_included_addon; never write a stale array.
create function public.set_addon_visibility_atomic(
  p_company_id uuid, p_addon_slug text, p_hide boolean
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare c public.companies%rowtype;
begin
  if p_addon_slug is null or p_addon_slug not in
    ('online_ordering', 'shopping_cart', 'quote_payments', 'reservation_calendar', 'email_marketing')
    or p_hide is null then
    return jsonb_build_object('success', false, 'error', 'Not a recognized feature or visibility choice.');
  end if;
  select * into c from public.companies where id = p_company_id for update;
  if not found or c.retired_at is not null then
    return jsonb_build_object('success', false, 'error', 'Company not available.');
  end if;
  update public.companies set disabled_addons = case
    when not p_hide then array_remove(c.disabled_addons, p_addon_slug)
    when p_addon_slug = any(coalesce(c.disabled_addons, '{}'::text[])) then c.disabled_addons
    else array_append(coalesce(c.disabled_addons, '{}'::text[]), p_addon_slug)
    end where id = c.id;
  return jsonb_build_object('success', true);
end;
$$;
revoke all on function public.set_addon_visibility_atomic(uuid, text, boolean)
  from public, anon, authenticated;
grant execute on function public.set_addon_visibility_atomic(uuid, text, boolean)
  to service_role;
