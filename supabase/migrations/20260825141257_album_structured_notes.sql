alter table public.photo_albums
  add column if not exists notes_overview text,
  add column if not exists notes_materials text,
  add column if not exists notes_measurements text,
  add column if not exists notes_labor text,
  add column if not exists notes_follow_up text;

update public.photo_albums
set notes_overview = notes
where notes is not null
  and nullif(btrim(notes), '') is not null
  and notes_overview is null;
