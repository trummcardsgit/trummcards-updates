-- TrummCards Cloud 1.1: backwards-compatible extended card metadata.
-- STAGING ONLY: keep this migration on the 1.1 feature branch until release.
-- The existing 1.0 UI, purchases, FIFO sale functions, image policies and owner RLS are untouched.
alter table public.tc_products
  add column if not exists card_number text not null default '',
  add column if not exists rarity text not null default '',
  add column if not exists card_variant text not null default '',
  add column if not exists storage_location text not null default '',
  add column if not exists grading_company text not null default '',
  add column if not exists grading_grade text not null default '',
  add column if not exists grading_certificate text not null default '',
  add column if not exists catalog_card_id text not null default '',
  add column if not exists market_price_eur numeric(12,2),
  add column if not exists market_price_source text not null default '',
  add column if not exists market_price_checked_at timestamptz;

alter table public.tc_products
  add constraint tc_products_11_card_number_len check (length(card_number)<=60),
  add constraint tc_products_11_rarity_len check (length(rarity)<=100),
  add constraint tc_products_11_variant_len check (length(card_variant)<=100),
  add constraint tc_products_11_storage_len check (length(storage_location)<=160),
  add constraint tc_products_11_grading_company_len check (length(grading_company)<=60),
  add constraint tc_products_11_grading_grade_len check (length(grading_grade)<=30),
  add constraint tc_products_11_grading_cert_len check (length(grading_certificate)<=120),
  add constraint tc_products_11_catalog_len check (length(catalog_card_id)<=160),
  add constraint tc_products_11_market_source_len check (length(market_price_source)<=120),
  add constraint tc_products_11_market_price_nonnegative check (market_price_eur is null or market_price_eur>=0);

-- RLS is already enabled on tc_products and owner-scoped. Keep owner_id immutable.
-- Existing column-specific GRANTs must be extended to accept new metadata from the clients.
grant insert (card_number,rarity,card_variant,storage_location,
              grading_company,grading_grade,grading_certificate,
              catalog_card_id,market_price_eur,market_price_source,market_price_checked_at)
  on public.tc_products to authenticated;
grant update (card_number,rarity,card_variant,storage_location,
              grading_company,grading_grade,grading_certificate,
              catalog_card_id,market_price_eur,market_price_source,market_price_checked_at)
  on public.tc_products to authenticated;

create index if not exists tc_products_11_location on public.tc_products(owner_id, lower(storage_location))
  where storage_location<>'';
create index if not exists tc_products_11_card_number on public.tc_products(owner_id, lower(card_number))
  where card_number<>'';

comment on column public.tc_products.market_price_eur is
  'Optional external market estimate, not guaranteed selling price. Source and timestamp required when set by an integration.';
