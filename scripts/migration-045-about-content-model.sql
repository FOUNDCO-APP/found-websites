-- migration-045: split homepage about preview from full about page content

alter table public.website_config
  add column if not exists about_preview text,
  add column if not exists about_story text,
  add column if not exists about_highlights jsonb default null;

create or replace function public.publish_website_copy_with_snapshot(
  p_company_id uuid,
  p_new_copy jsonb,
  p_created_by text default 'found_admin'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_config public.website_config%rowtype;
  version_id uuid;
begin
  select * into current_config
  from public.website_config
  where company_id = p_company_id
  for update;

  if not found then
    raise exception 'Website config not found';
  end if;

  insert into public.website_copy_versions (
    company_id,
    website_config_id,
    snapshot,
    reason,
    created_by
  ) values (
    p_company_id,
    current_config.id,
    jsonb_build_object(
      'hero_title', current_config.hero_title,
      'hero_subtitle', current_config.hero_subtitle,
      'about_text', current_config.about_text,
      'about_preview', current_config.about_preview,
      'about_story', current_config.about_story,
      'about_highlights', current_config.about_highlights,
      'tagline', current_config.tagline,
      'cta_headline', current_config.cta_headline,
      'services', current_config.services,
      'faq_items', current_config.faq_items,
      'copy_generated', current_config.copy_generated
    ),
    'before_regenerate',
    p_created_by
  ) returning id into version_id;

  update public.website_config set
    hero_title = coalesce(p_new_copy->>'hero_title', current_config.hero_title),
    hero_subtitle = coalesce(p_new_copy->>'hero_subtitle', current_config.hero_subtitle),
    about_text = coalesce(p_new_copy->>'about_text', current_config.about_text),
    about_preview = coalesce(p_new_copy->>'about_preview', current_config.about_preview),
    about_story = coalesce(p_new_copy->>'about_story', current_config.about_story),
    about_highlights = coalesce(p_new_copy->'about_highlights', current_config.about_highlights),
    tagline = coalesce(p_new_copy->>'tagline', current_config.tagline),
    cta_headline = coalesce(p_new_copy->>'cta_headline', current_config.cta_headline),
    services = coalesce(p_new_copy->'services', current_config.services),
    faq_items = coalesce(p_new_copy->'faq_items', current_config.faq_items),
    copy_generated = coalesce((p_new_copy->>'copy_generated')::boolean, current_config.copy_generated, false)
  where id = current_config.id;

  return version_id;
end;
$$;

create or replace function public.restore_website_copy_version(
  p_version_id uuid,
  p_created_by text default 'found_admin'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_version public.website_copy_versions%rowtype;
  current_config public.website_config%rowtype;
  recovery_version_id uuid;
begin
  select * into target_version
  from public.website_copy_versions
  where id = p_version_id
  for update;

  if not found then
    raise exception 'Copy version not found';
  end if;

  if target_version.restored_at is not null then
    raise exception 'Copy version already restored';
  end if;

  select * into current_config
  from public.website_config
  where id = target_version.website_config_id
    and company_id = target_version.company_id
  for update;

  if not found then
    raise exception 'Website config not found';
  end if;

  insert into public.website_copy_versions (
    company_id,
    website_config_id,
    snapshot,
    reason,
    created_by
  ) values (
    target_version.company_id,
    target_version.website_config_id,
    jsonb_build_object(
      'hero_title', current_config.hero_title,
      'hero_subtitle', current_config.hero_subtitle,
      'about_text', current_config.about_text,
      'about_preview', current_config.about_preview,
      'about_story', current_config.about_story,
      'about_highlights', current_config.about_highlights,
      'tagline', current_config.tagline,
      'cta_headline', current_config.cta_headline,
      'services', current_config.services,
      'faq_items', current_config.faq_items,
      'copy_generated', current_config.copy_generated
    ),
    'before_restore',
    p_created_by
  ) returning id into recovery_version_id;

  update public.website_config set
    hero_title = target_version.snapshot->>'hero_title',
    hero_subtitle = target_version.snapshot->>'hero_subtitle',
    about_text = target_version.snapshot->>'about_text',
    about_preview = target_version.snapshot->>'about_preview',
    about_story = target_version.snapshot->>'about_story',
    about_highlights = target_version.snapshot->'about_highlights',
    tagline = target_version.snapshot->>'tagline',
    cta_headline = target_version.snapshot->>'cta_headline',
    services = target_version.snapshot->'services',
    faq_items = target_version.snapshot->'faq_items',
    copy_generated = coalesce((target_version.snapshot->>'copy_generated')::boolean, false)
  where id = current_config.id;

  update public.website_copy_versions
  set restored_at = now()
  where id = target_version.id;

  return recovery_version_id;
end;
$$;

revoke execute on function public.publish_website_copy_with_snapshot(uuid, jsonb, text) from public, anon, authenticated;
revoke execute on function public.restore_website_copy_version(uuid, text) from public, anon, authenticated;
grant execute on function public.publish_website_copy_with_snapshot(uuid, jsonb, text) to service_role;
grant execute on function public.restore_website_copy_version(uuid, text) to service_role;