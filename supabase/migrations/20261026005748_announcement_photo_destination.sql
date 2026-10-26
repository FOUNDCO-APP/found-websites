begin;

-- Keep the hardened placement transaction and change only its presentation contract.
create function public.publish_announcement_photo(
  p_company_id uuid,
  p_photo_id uuid,
  p_expected_url text,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_config public.website_config%rowtype;
  saved_config public.website_config%rowtype;
  selected_style text;
  published jsonb;
  config_rows bigint;
begin
  if p_company_id is null or p_photo_id is null or p_expected_url is null then
    raise exception 'Announcement publication inputs are required';
  end if;

  select * into strict current_config from public.website_config
    where company_id = p_company_id for update;
  if current_config.updated_at is distinct from p_expected_updated_at then
    raise exception 'Announcement changed; refresh before publishing' using errcode = '40001';
  end if;
  selected_style := case when current_config.announcement_style in ('artwork', 'image') then 'dark'
    else current_config.announcement_style end;

  published := public.publish_homepage_highlight(p_company_id, p_photo_id, p_expected_url, p_expected_updated_at);

  update public.website_config set
    announcement_cta_href = '#announcement-photo',
    announcement_style = selected_style
    where id = current_config.id and company_id = p_company_id;
  get diagnostics config_rows = row_count;
  if config_rows <> 1 then
    raise exception 'Announcement destination was not updated';
  end if;

  select * into strict saved_config from public.website_config
    where id = current_config.id and company_id = p_company_id;
  if saved_config.announcement_cta_href is distinct from '#announcement-photo'
    or saved_config.announcement_style is distinct from selected_style
    or saved_config.announcement_enabled is distinct from true then
    raise exception 'Announcement destination state was not preserved';
  end if;

  return published || pg_catalog.jsonb_build_object('style', selected_style);
end;
$$;

revoke all on function public.publish_announcement_photo(uuid, uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.publish_announcement_photo(uuid, uuid, text, timestamptz) to service_role;

commit;
