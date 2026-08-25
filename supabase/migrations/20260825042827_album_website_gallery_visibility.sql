alter table public.photo_albums
  add column if not exists show_on_website_gallery boolean not null default true;

update public.photo_albums
set show_on_website_gallery = false
where album_type = 'job';
