-- Server-only transaction: identity arguments come only from verified server auth.
create function public.select_pro_included_addon(
  p_company_id uuid, p_actor_id uuid, p_actor_email text,
  p_addon_slug text, p_expected_pick text, p_confirm_turn_on boolean
) returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  c public.companies%rowtype;
  member_owner boolean := false;
begin
  select * into c from public.companies where id = p_company_id for update;
  if not found or c.retired_at is not null or p_actor_id is null then
    return jsonb_build_object('success', false, 'error', 'Not authorized.');
  end if;
  if not (coalesce(c.user_id = p_actor_id, false)
    or (coalesce(p_actor_email, '') <> '' and coalesce(c.email = p_actor_email, false))) then
    -- Lock any owner membership against concurrent revocation until commit.
    perform 1 from public.company_members m
      where m.company_id = c.id and m.role = 'owner' and m.status = 'active'
        and (m.user_id = p_actor_id or
          (coalesce(p_actor_email, '') <> '' and m.email = p_actor_email))
      for share;
    member_owner := found;
    if not member_owner then
      return jsonb_build_object('success', false, 'error', 'Not authorized.');
    end if;
  end if;
  if c.plan is distinct from 'found_pro'
    or coalesce(c.subscription_status, '') not in ('active', 'trialing') then
    return jsonb_build_object('success', false, 'error', 'Available with an active Pro plan.');
  end if;
  if p_addon_slug is not null and p_addon_slug not in
    ('online_ordering', 'shopping_cart', 'quote_payments', 'reservation_calendar', 'email_marketing') then
    return jsonb_build_object('success', false, 'error', 'Not a recognized feature.');
  end if;
  if c.included_addon_slug is distinct from p_expected_pick then
    return jsonb_build_object('success', false, 'error', 'Your choice changed. Refresh your features and try again.');
  end if;
  if p_addon_slug is not null and exists (
    select 1 from public.addon_subscriptions
      where company_id = c.id and addon_slug = p_addon_slug and active = true
  ) then
    return jsonb_build_object('success', false, 'error', 'This feature is already paid for. Choose another included feature; billing has not changed.');
  end if;
  if p_addon_slug = any(coalesce(c.disabled_addons, '{}'::text[]))
    and p_confirm_turn_on is distinct from true then
    return jsonb_build_object('success', false, 'error', 'Confirm turning this feature on before continuing.');
  end if;
  update public.companies set included_addon_slug = p_addon_slug,
    disabled_addons = case when p_addon_slug is not null and p_confirm_turn_on is true
      then array_remove(c.disabled_addons, p_addon_slug) else c.disabled_addons end
    where id = c.id;
  -- Selection grants access only. Calendar setup owns hours; never seed here.
  return jsonb_build_object('success', true);
end;
$$;
revoke all on function public.select_pro_included_addon(uuid, uuid, text, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.select_pro_included_addon(uuid, uuid, text, text, text, boolean)
  to service_role;
