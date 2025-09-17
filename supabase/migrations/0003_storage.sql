-- Create storage bucket for product images and set policies
-- create public bucket by inserting into storage.buckets (hosted-compatible)
insert into storage.buckets (id, name, public)
values ('product-images','product-images', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload to product-images
drop policy if exists "product_images_upload" on storage.objects;
create policy "product_images_upload"
on storage.objects
for insert to authenticated
with check (bucket_id = 'product-images');

-- Allow public read on product-images (since bucket is public, but policy for completeness)
drop policy if exists "product_images_read" on storage.objects;
create policy "product_images_read"
on storage.objects
for select
using (bucket_id = 'product-images');

-- Allow owners to update/delete their own files by mapping path to user id prefix (optional)
-- If using path convention `${user_id}/filename`, restrict updates/deletes
drop policy if exists "product_images_owner_update" on storage.objects;
create policy "product_images_owner_update"
on storage.objects
for update to authenticated
using (
  bucket_id = 'product-images' and
  (position((auth.uid())::text in name) = 1)
);

drop policy if exists "product_images_owner_delete" on storage.objects;
create policy "product_images_owner_delete"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'product-images' and
  (position((auth.uid())::text in name) = 1)
);


