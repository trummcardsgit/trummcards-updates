-- TrummCards Production: harden card-photo RLS owner correlation.
-- Current schema is empty. Safe, data-preserving ALTER POLICY; never touches TEST.
-- An unqualified owner_id inside the tc_products subquery resolves to p.owner_id,
-- so it must be explicitly linked to tc_product_images.owner_id.
alter policy tc_product_images_read on public.tc_product_images
  using (
    owner_id=(select auth.uid()) and (select trummcards_private.is_owner())
    and exists (
      select 1 from public.tc_products p
      where p.id=tc_product_images.product_id
        and p.owner_id=tc_product_images.owner_id
    )
  );

alter policy tc_product_images_insert on public.tc_product_images
  with check (
    owner_id=(select auth.uid()) and (select trummcards_private.is_owner())
    and exists (
      select 1 from public.tc_products p
      where p.id=tc_product_images.product_id
        and p.owner_id=tc_product_images.owner_id
    )
  );

alter policy tc_product_images_update on public.tc_product_images
  using (
    owner_id=(select auth.uid()) and (select trummcards_private.is_owner())
    and exists (
      select 1 from public.tc_products p
      where p.id=tc_product_images.product_id
        and p.owner_id=tc_product_images.owner_id
    )
  )
  with check (
    owner_id=(select auth.uid()) and (select trummcards_private.is_owner())
    and exists (
      select 1 from public.tc_products p
      where p.id=tc_product_images.product_id
        and p.owner_id=tc_product_images.owner_id
    )
  );
