begin;

-- Only the owner-authorized server action calls this service-role transaction.
create function public.publish_homepage_highlight(
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
  source_photo public.company_photos%rowtype;
  placed_photo public.company_photos%rowtype;
  cleared_ids jsonb;
begin
  if p_company_id is null or p_photo_id is null or p_expected_url is null then
    raise exception 'Highlight publication inputs are required';
  end if;

  -- Serializes this RPC's publications for a company, including competing tabs.
  select * into strict current_config from public.website_config
    where company_id = p_company_id for update;
  if current_config.updated_at is distinct from p_expected_updated_at then
    raise exception 'Highlight changed; refresh before publishing' using errcode = '40001';
  end if;

  select * into strict source_photo from public.company_photos
    where company_id = p_company_id and id = p_photo_id for update;
  if source_photo.url is distinct from p_expected_url then
    raise exception 'Selected photo changed; refresh before publishing' using errcode = '40001';
  end if;
  if source_photo.url !~* '^https?://' or source_photo.url !~* '\.(jpe?g|png|webp|avif)([?#].*)?$' then
    raise exception 'Select a still image for the highlight';
  end if;

  -- Do not move the selected original, alter Gallery/album flags, or delete bytes.
  with cleared as (
    update public.company_photos set website_section = null
      where company_id = p_company_id and website_section = 'announcement'
      returning id
  ) select coalesce(pg_catalog.jsonb_agg(id), '[]'::jsonb) into cleared_ids from cleared;

  insert into public.company_photos (
    company_id, url, storage_path, note, website_section,
    for_website, in_gallery, for_social, album_id
  ) values (
    p_company_id, source_photo.url, source_photo.storage_path, source_photo.note, 'announcement',
    true, false, false, null
  ) returning * into placed_photo;

  update public.website_config set
    announcement_enabled = true,
    announcement_style = 'artwork',
    updated_at = greatest(pg_catalog.clock_timestamp(),
      coalesce(current_config.updated_at, '-infinity'::timestamptz) + interval '1 microsecond')
    where id = current_config.id and company_id = p_company_id;

  return pg_catalog.jsonb_build_object(
    'photo', pg_catalog.to_jsonb(placed_photo),
    'clearedPhotoIds', cleared_ids
  );
end;
$$;

revoke all on function public.publish_homepage_highlight(uuid, uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.publish_homepage_highlight(uuid, uuid, text, timestamptz) to service_role;

commit;
