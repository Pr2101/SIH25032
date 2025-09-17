-- Add caching fields to places and create place-images bucket
create extension if not exists pgcrypto;

alter table public.places add column if not exists gemini_cache_json jsonb;
alter table public.places add column if not exists gemini_cached_at timestamptz;

-- place-images bucket (public)
insert into storage.buckets (id, name, public)
values ('place-images','place-images', true)
on conflict (id) do nothing;

-- Storage policies for place-images
drop policy if exists "place_images_upload" on storage.objects;
create policy "place_images_upload"
on storage.objects
for insert to authenticated
with check (bucket_id = 'place-images');

drop policy if exists "place_images_read" on storage.objects;
create policy "place_images_read"
on storage.objects
for select
using (bucket_id = 'place-images');

drop policy if exists "place_images_owner_update" on storage.objects;
create policy "place_images_owner_update"
on storage.objects
for update to authenticated
using (
  bucket_id = 'place-images' and (position((auth.uid())::text in name) = 1)
);

drop policy if exists "place_images_owner_delete" on storage.objects;
create policy "place_images_owner_delete"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'place-images' and (position((auth.uid())::text in name) = 1)
);


