-- ADDITIVE Cloud 1.1 card art link. External catalog images are not downloaded/rehosted.
-- TEST first; PROD remains unchanged until a separately approved release.
alter table public.tc_products
  add column if not exists catalog_image_url text not null default '';
alter table public.tc_products
  add constraint tc_products_11_catalog_image_url_safe
  check (catalog_image_url = '' or (
    length(catalog_image_url) <= 500
    and catalog_image_url ~ '^https://assets[.]tcgdex[.]net/[A-Za-z0-9/._-]+$'
  ));
grant insert (catalog_image_url) on public.tc_products to authenticated;
grant update (catalog_image_url) on public.tc_products to authenticated;
comment on column public.tc_products.catalog_image_url is
  'TCGdex image URL reference only (no rehosting), owner-scoped by tc_products RLS. Own uploaded photos take priority. May require active internet.';
