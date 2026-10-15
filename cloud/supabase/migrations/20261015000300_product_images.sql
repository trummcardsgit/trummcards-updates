-- TrummCards Cloud TEST v0.2: Article hero images independent of inventory lots.
-- Existing lot-level images are preserved. Product can be created with zero stock.
create table if not exists public.tc_product_images (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  product_id uuid not null references public.tc_products(id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null default 'image/jpeg',
  created_at timestamptz not null default now(),
  constraint tc_product_images_one_per_product unique (product_id),
  constraint tc_product_images_mimetype check (mime_type in ('image/jpeg','image/png','image/webp')),
  constraint tc_product_images_path check (storage_path like (owner_id::text || '/products/' || product_id::text || '/%'))
);
create index if not exists tc_product_images_owner_idx on public.tc_product_images(owner_id);
alter table public.tc_product_images enable row level security;
create policy tc_product_images_read on public.tc_product_images for select to authenticated
 using (owner_id=(select auth.uid()) and (select trummcards_private.is_owner())
   and exists(select 1 from public.tc_products p where p.id=product_id and p.owner_id=owner_id));
create policy tc_product_images_insert on public.tc_product_images for insert to authenticated
 with check (owner_id=(select auth.uid()) and (select trummcards_private.is_owner())
   and exists(select 1 from public.tc_products p where p.id=product_id and p.owner_id=owner_id));
create policy tc_product_images_update on public.tc_product_images for update to authenticated
 using (owner_id=(select auth.uid()) and (select trummcards_private.is_owner())
   and exists(select 1 from public.tc_products p where p.id=product_id and p.owner_id=owner_id))
 with check (owner_id=(select auth.uid()) and (select trummcards_private.is_owner())
   and exists(select 1 from public.tc_products p where p.id=product_id and p.owner_id=owner_id));
create policy tc_product_images_delete on public.tc_product_images for delete to authenticated
 using (owner_id=(select auth.uid()) and (select trummcards_private.is_owner()));
grant select,insert,update,delete on public.tc_product_images to authenticated;
revoke all on public.tc_product_images from anon;
