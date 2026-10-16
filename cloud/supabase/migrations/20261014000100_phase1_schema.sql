-- TrummCards Cloud Phase 1: SCHEMA ONLY. NOT applied to any hosted database.
-- Requires Supabase PostgreSQL 15+ with Auth and Storage schemas.
-- Apply only in a NEW, isolated Supabase project after manual review.

begin;

create schema if not exists trummcards_private;
revoke all on schema trummcards_private from public, anon, authenticated;
grant usage on schema trummcards_private to authenticated;

-- Exactly one user must be whitelisted by a trusted administrator, not by the client.
-- No account can claim this singleton using the public API.
create table trummcards_private.owner_guard (
  singleton boolean primary key default true check (singleton = true),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
revoke all on trummcards_private.owner_guard from public, anon, authenticated;

create or replace function trummcards_private.is_owner()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from trummcards_private.owner_guard
    where user_id = (select auth.uid())
  );
$$;
revoke all on function trummcards_private.is_owner() from public, anon, authenticated;
grant execute on function trummcards_private.is_owner() to authenticated;

-- Products: one SKU per user (case-insensitive); empty SKU is allowed.
create table public.tc_products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  sku text,
  name text not null check (length(btrim(name)) between 1 and 300),
  set_name text not null default '',
  language text not null default 'Deutsch',
  card_condition text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  check (sku is null or length(sku) <= 120)
);
create unique index tc_products_sku_unique on public.tc_products(owner_id, lower(btrim(sku)))
  where sku is not null and btrim(sku) <> '';
create index tc_products_name_search on public.tc_products(owner_id, lower(name));

create table public.tc_purchase_lots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  product_id uuid not null,
  bought_on date not null,
  purchased_qty integer not null check (purchased_qty > 0),
  available_qty integer not null check (available_qty >= 0 and available_qty <= purchased_qty),
  purchase_total numeric(14,2) not null check (purchase_total >= 0),
  extra_cost numeric(14,2) not null default 0 check (extra_cost >= 0),
  allocated_cost numeric(14,2) not null default 0 check (allocated_cost >= 0),
  source text not null default '',
  note text not null default '',
  -- Stable retry key, enforced at the DB instead of trusting clients.
  request_key uuid not null,
  created_at timestamptz not null default now(),
  foreign key (product_id, owner_id) references public.tc_products(id, owner_id) on delete restrict,
  unique (owner_id, request_key),
  unique (id, owner_id),
  unique (id, product_id, owner_id),
  check (allocated_cost <= (purchase_total + extra_cost)),
  check (available_qty > 0 or allocated_cost = (purchase_total + extra_cost))
);
create index tc_lots_fifo on public.tc_purchase_lots(owner_id, product_id, bought_on, created_at, id)
  where available_qty > 0;

create table public.tc_sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  product_id uuid not null,
  sold_on date not null,
  qty integer not null check (qty > 0),
  price numeric(14,2) not null check (price >= 0),
  shipping_income numeric(14,2) not null default 0 check (shipping_income >= 0),
  shipping_cost numeric(14,2) not null default 0 check (shipping_cost >= 0),
  fees numeric(14,2) not null default 0 check (fees >= 0),
  other_cost numeric(14,2) not null default 0 check (other_cost >= 0),
  cogs_total numeric(14,2) not null default 0 check (cogs_total >= 0),
  platform text not null default '',
  note text not null default '',
  status text not null default 'booked' check (status in ('booked','voided')),
  request_key uuid not null,
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  foreign key (product_id, owner_id) references public.tc_products(id, owner_id) on delete restrict,
  unique (owner_id, request_key),
  unique (id, owner_id),
  unique (id, product_id, owner_id)
);
create index tc_sales_by_date on public.tc_sales(owner_id, sold_on desc);

create table public.tc_sale_allocations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  sale_id uuid not null,
  product_id uuid not null,
  lot_id uuid not null,
  qty integer not null check (qty > 0),
  unit_cost_snapshot numeric(18,6) not null check (unit_cost_snapshot >= 0),
  cost_amount numeric(14,2) not null check (cost_amount >= 0),
  created_at timestamptz not null default now(),
  foreign key (sale_id, product_id, owner_id) references public.tc_sales(id, product_id, owner_id) on delete restrict,
  foreign key (lot_id, product_id, owner_id) references public.tc_purchase_lots(id, product_id, owner_id) on delete restrict,
  unique (sale_id, lot_id),
  unique (id, owner_id)
);
create index tc_alloc_lot on public.tc_sale_allocations(owner_id, lot_id);

-- Append-only audit history: negative quantity = outgoing sale, positive = incoming.
create table public.tc_stock_movements (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id),
  product_id uuid not null,
  lot_id uuid not null,
  sale_id uuid,
  movement_type text not null check (movement_type in ('purchase','sale','sale_void','legacy_import')),
  quantity_delta integer not null check (quantity_delta <> 0),
  cost_delta numeric(14,2) not null,
  created_at timestamptz not null default now(),
  foreign key (product_id, owner_id) references public.tc_products(id, owner_id) on delete restrict,
  foreign key (lot_id, product_id, owner_id) references public.tc_purchase_lots(id, product_id, owner_id) on delete restrict,
  foreign key (sale_id, product_id, owner_id) references public.tc_sales(id, product_id, owner_id) on delete restrict
);
create index tc_movements_product on public.tc_stock_movements(owner_id, product_id, created_at);

-- Image metadata (not the image bytes). Each legacy picture belongs to one purchase lot.
create table public.tc_lot_images (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  lot_id uuid not null,
  storage_path text not null,
  display_order integer not null default 0 check (display_order >= 0),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  created_at timestamptz not null default now(),
  foreign key (lot_id, owner_id) references public.tc_purchase_lots(id, owner_id) on delete cascade,
  unique (owner_id, storage_path),
  check (storage_path = owner_id::text || '/' || lot_id::text || '/' || id::text ||
    case mime_type when 'image/jpeg' then '.jpg' when 'image/png' then '.png' when 'image/webp' then '.webp' end)
);

-- Import tracking is reserved for a future approved server-side, transactional migration.
create table trummcards_private.import_batches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  backup_sha256 char(64) not null,
  state text not null default 'staged' check (state in ('staged','validated','committed','aborted')),
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (owner_id, backup_sha256)
);
create table trummcards_private.legacy_id_map (
  owner_id uuid not null references auth.users(id),
  batch_id uuid not null references trummcards_private.import_batches(id),
  legacy_type text not null check (legacy_type in ('product','lot','sale')),
  legacy_id text not null,
  new_id uuid not null,
  primary key (owner_id, legacy_type, legacy_id),
  unique (owner_id, legacy_type, new_id)
);
revoke all on trummcards_private.import_batches, trummcards_private.legacy_id_map from public, anon, authenticated;

-- Every exposed table has RLS. Owner identity is set only by a SQL administrator.
alter table public.tc_products enable row level security;
alter table public.tc_purchase_lots enable row level security;
alter table public.tc_sales enable row level security;
alter table public.tc_sale_allocations enable row level security;
alter table public.tc_stock_movements enable row level security;
alter table public.tc_lot_images enable row level security;

revoke all on table public.tc_products, public.tc_purchase_lots, public.tc_sales,
  public.tc_sale_allocations, public.tc_stock_movements, public.tc_lot_images
  from public, anon, authenticated;

grant select on public.tc_products, public.tc_purchase_lots, public.tc_sales,
  public.tc_sale_allocations, public.tc_stock_movements, public.tc_lot_images
  to authenticated;
-- Only product descriptive fields can be directly edited by its owner;
-- stock, money history, sales and allocations are RPC-only.
grant insert (owner_id, sku, name, set_name, language, card_condition, note)
  on public.tc_products to authenticated;
grant update (sku, name, set_name, language, card_condition, note)
  on public.tc_products to authenticated;

create policy tc_products_read on public.tc_products for select to authenticated
  using (owner_id = (select auth.uid()) and (select trummcards_private.is_owner()));
create policy tc_products_insert on public.tc_products for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select trummcards_private.is_owner()));
create policy tc_products_update on public.tc_products for update to authenticated
  using (owner_id = (select auth.uid()) and (select trummcards_private.is_owner()))
  with check (owner_id = (select auth.uid()) and (select trummcards_private.is_owner()));

create policy tc_lots_read on public.tc_purchase_lots for select to authenticated
  using (owner_id = (select auth.uid()) and (select trummcards_private.is_owner()));
create policy tc_sales_read on public.tc_sales for select to authenticated
  using (owner_id = (select auth.uid()) and (select trummcards_private.is_owner()));
create policy tc_allocs_read on public.tc_sale_allocations for select to authenticated
  using (owner_id = (select auth.uid()) and (select trummcards_private.is_owner()));
create policy tc_movements_read on public.tc_stock_movements for select to authenticated
  using (owner_id = (select auth.uid()) and (select trummcards_private.is_owner()));
create policy tc_images_read on public.tc_lot_images for select to authenticated
  using (owner_id = (select auth.uid()) and (select trummcards_private.is_owner()));

-- Only image metadata can be edited by the owner, with a matching owner/lot FK.
grant insert (id, owner_id, lot_id, storage_path, display_order, mime_type)
  on public.tc_lot_images to authenticated;
grant update (display_order) on public.tc_lot_images to authenticated;
grant delete on public.tc_lot_images to authenticated;
create policy tc_images_insert on public.tc_lot_images for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select trummcards_private.is_owner()));
create policy tc_images_update on public.tc_lot_images for update to authenticated
  using (owner_id = (select auth.uid()) and (select trummcards_private.is_owner()))
  with check (owner_id = (select auth.uid()) and (select trummcards_private.is_owner()));
create policy tc_images_delete on public.tc_lot_images for delete to authenticated
  using (owner_id = (select auth.uid()) and (select trummcards_private.is_owner()));

-- PostgreSQL >= 15: security_invoker prevents bypass of underlying table RLS.
create or replace view public.tc_inventory with (security_invoker = true) as
select p.owner_id, p.id as product_id, p.sku, p.name, p.set_name,
       coalesce(sum(l.available_qty), 0)::bigint as available_qty,
       coalesce(sum(l.purchase_total + l.extra_cost - l.allocated_cost), 0)::numeric(14,2) as remaining_cost
from public.tc_products p
left join public.tc_purchase_lots l on l.product_id = p.id and l.owner_id = p.owner_id
group by p.owner_id, p.id, p.sku, p.name, p.set_name;
revoke all on public.tc_inventory from public, anon, authenticated;
grant select on public.tc_inventory to authenticated;

-- FIFO purchase: locks the product to serialize purchases/sales and avoid races.
create or replace function trummcards_private.book_purchase(
  p_product_id uuid, p_bought_on date, p_qty integer,
  p_purchase_total numeric, p_extra_cost numeric, p_source text,
  p_note text, p_request_key uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_id uuid;
begin
  if v_user is null or not trummcards_private.is_owner() then
    raise exception 'Nicht autorisiert' using errcode = '42501';
  end if;
  if p_product_id is null or p_bought_on is null or p_request_key is null or
     p_qty is null or p_qty <= 0 or p_qty > 1000000 or
     p_purchase_total is null or p_purchase_total < 0 or p_purchase_total > 999999999999.99 or
     p_extra_cost is null or p_extra_cost < 0 or p_extra_cost > 999999999999.99 or
     p_purchase_total <> round(p_purchase_total,2) or p_extra_cost <> round(p_extra_cost,2) then
    raise exception 'Ungültiger Einkauf' using errcode = '22023';
  end if;
  perform 1 from public.tc_products where id=p_product_id and owner_id=v_user for update;
  if not found then raise exception 'Artikel nicht gefunden' using errcode='P0002'; end if;
  select id into v_id from public.tc_purchase_lots
    where owner_id=v_user and request_key=p_request_key;
  if found then
    if not exists (select 1 from public.tc_purchase_lots where id=v_id
      and product_id=p_product_id and bought_on=p_bought_on and purchased_qty=p_qty
      and purchase_total=p_purchase_total and extra_cost=p_extra_cost
      and source=coalesce(p_source,'') and note=coalesce(p_note,'')) then
      raise exception 'Buchungsschlüssel wurde für anderen Einkauf verwendet' using errcode='23505';
    end if;
    return v_id;
  end if;
  insert into public.tc_purchase_lots(owner_id,product_id,bought_on,purchased_qty,available_qty,
    purchase_total,extra_cost,source,note,request_key)
  values (v_user,p_product_id,p_bought_on,p_qty,p_qty,p_purchase_total,p_extra_cost,
    coalesce(p_source,''),coalesce(p_note,''),p_request_key)
  returning id into v_id;
  insert into public.tc_stock_movements(owner_id,product_id,lot_id,movement_type,quantity_delta,cost_delta)
  values(v_user,p_product_id,v_id,'purchase',p_qty,p_purchase_total+p_extra_cost);
  return v_id;
end;
$$;

-- FIFO sale: one atomic transaction for stock change, cost allocation and history.
-- A repeated request_key returns the original sale instead of overselling.
create or replace function trummcards_private.book_sale(
  p_product_id uuid, p_sold_on date, p_qty integer, p_price numeric,
  p_shipping_income numeric, p_shipping_cost numeric, p_fees numeric,
  p_other_cost numeric, p_platform text, p_note text, p_request_key uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid(); v_id uuid; v_missing integer;
  v_take integer; v_cost numeric(14,2); v_cogs numeric(14,2) := 0;
  l record;
begin
  if v_user is null or not trummcards_private.is_owner() then
    raise exception 'Nicht autorisiert' using errcode='42501';
  end if;
  if p_product_id is null or p_sold_on is null or p_request_key is null
     or p_qty is null or p_qty <= 0 or p_qty > 1000000
     or p_price is null or p_shipping_income is null or p_shipping_cost is null
     or p_fees is null or p_other_cost is null then
    raise exception 'Ungültiger Verkauf' using errcode='22023';
  end if;
  if p_price < 0 or p_shipping_income < 0 or p_shipping_cost < 0 or p_fees < 0
     or p_other_cost < 0 or greatest(p_price,p_shipping_income,p_shipping_cost,p_fees,p_other_cost) > 999999999999.99
     or p_price <> round(p_price,2) or p_shipping_income <> round(p_shipping_income,2)
     or p_shipping_cost <> round(p_shipping_cost,2) or p_fees <> round(p_fees,2)
     or p_other_cost <> round(p_other_cost,2) then
    raise exception 'Ungültiger Geldbetrag' using errcode='22023';
  end if;
  perform 1 from public.tc_products where id=p_product_id and owner_id=v_user for update;
  if not found then raise exception 'Artikel nicht gefunden' using errcode='P0002'; end if;
  select id into v_id from public.tc_sales where owner_id=v_user and request_key=p_request_key;
  if found then
    if not exists (select 1 from public.tc_sales where id=v_id and product_id=p_product_id
      and sold_on=p_sold_on and qty=p_qty and price=p_price and shipping_income=p_shipping_income
      and shipping_cost=p_shipping_cost and fees=p_fees and other_cost=p_other_cost
      and platform=coalesce(p_platform,'') and note=coalesce(p_note,'')) then
      raise exception 'Buchungsschlüssel wurde für anderen Verkauf verwendet' using errcode='23505';
    end if;
    return v_id;
  end if;
  select p_qty - coalesce(sum(available_qty),0)::integer into v_missing
    from public.tc_purchase_lots where owner_id=v_user and product_id=p_product_id;
  if v_missing > 0 then raise exception 'Nicht genügend Bestand (Fehlmenge %)',v_missing using errcode='P0001'; end if;

  insert into public.tc_sales(owner_id,product_id,sold_on,qty,price,shipping_income,
    shipping_cost,fees,other_cost,platform,note,request_key)
  values(v_user,p_product_id,p_sold_on,p_qty,p_price,p_shipping_income,p_shipping_cost,
    p_fees,p_other_cost,coalesce(p_platform,''),coalesce(p_note,''),p_request_key)
  returning id into v_id;
  v_missing := p_qty;
  for l in select * from public.tc_purchase_lots
           where owner_id=v_user and product_id=p_product_id and available_qty>0
           order by bought_on,created_at,id for update
  loop
    exit when v_missing=0;
    v_take := least(v_missing,l.available_qty);
    -- Final consumption absorbs cent-rounding remainder, never losing a cent.
    if v_take=l.available_qty then
      v_cost := l.purchase_total + l.extra_cost - l.allocated_cost;
    else
      v_cost := least(
        round(((l.purchase_total + l.extra_cost) / l.purchased_qty) * v_take,2),
        l.purchase_total + l.extra_cost - l.allocated_cost
      );
    end if;
    update public.tc_purchase_lots set available_qty=available_qty-v_take,
      allocated_cost=allocated_cost+v_cost where id=l.id;
    insert into public.tc_sale_allocations(owner_id,sale_id,product_id,lot_id,qty,
      unit_cost_snapshot,cost_amount)
    values(v_user,v_id,p_product_id,l.id,v_take,
      round((l.purchase_total+l.extra_cost)/l.purchased_qty,6),v_cost);
    insert into public.tc_stock_movements(owner_id,product_id,lot_id,sale_id,movement_type,quantity_delta,cost_delta)
    values(v_user,p_product_id,l.id,v_id,'sale',-v_take,-v_cost);
    v_missing := v_missing-v_take; v_cogs := v_cogs+v_cost;
  end loop;
  if v_missing<>0 then raise exception 'FIFO-Zuordnung inkonsistent' using errcode='P0001'; end if;
  update public.tc_sales set cogs_total=v_cogs where id=v_id;
  return v_id;
end;
$$;

-- Cancellations reverse allocations without deleting the audit history.
create or replace function trummcards_private.void_sale(p_sale_id uuid)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_product uuid; v_status text; a record;
begin
  if v_user is null or not trummcards_private.is_owner() then
    raise exception 'Nicht autorisiert' using errcode='42501';
  end if;
  select product_id into v_product from public.tc_sales where id=p_sale_id and owner_id=v_user;
  if not found then raise exception 'Verkauf nicht gefunden' using errcode='P0002'; end if;
  perform 1 from public.tc_products where id=v_product and owner_id=v_user for update;
  select status into v_status from public.tc_sales where id=p_sale_id and owner_id=v_user for update;
  if v_status='voided' then return false; end if;
  for a in select * from public.tc_sale_allocations
    where sale_id=p_sale_id and owner_id=v_user order by created_at,id for update
  loop
    update public.tc_purchase_lots set available_qty=available_qty+a.qty,
      allocated_cost=allocated_cost-a.cost_amount where id=a.lot_id;
    insert into public.tc_stock_movements(owner_id,product_id,lot_id,sale_id,movement_type,quantity_delta,cost_delta)
      values(v_user,v_product,a.lot_id,p_sale_id,'sale_void',a.qty,a.cost_amount);
  end loop;
  update public.tc_sales set status='voided',voided_at=now() where id=p_sale_id;
  return true;
end;
$$;

-- SQL-invoker API wrappers; privileged implementations are NOT in exposed schema.
create or replace function public.tc_book_purchase(
  p_product_id uuid, p_bought_on date, p_qty integer,
  p_purchase_total numeric, p_extra_cost numeric, p_source text,
  p_note text, p_request_key uuid
) returns uuid language sql security invoker set search_path = '' as $$
  select trummcards_private.book_purchase(p_product_id,p_bought_on,p_qty,p_purchase_total,
    p_extra_cost,p_source,p_note,p_request_key);
$$;
create or replace function public.tc_book_sale(
  p_product_id uuid, p_sold_on date, p_qty integer, p_price numeric,
  p_shipping_income numeric, p_shipping_cost numeric, p_fees numeric,
  p_other_cost numeric, p_platform text, p_note text, p_request_key uuid
) returns uuid language sql security invoker set search_path = '' as $$
  select trummcards_private.book_sale(p_product_id,p_sold_on,p_qty,p_price,p_shipping_income,
    p_shipping_cost,p_fees,p_other_cost,p_platform,p_note,p_request_key);
$$;
create or replace function public.tc_void_sale(p_sale_id uuid)
returns boolean language sql security invoker set search_path = '' as $$
  select trummcards_private.void_sale(p_sale_id);
$$;

revoke all on function trummcards_private.book_purchase(uuid,date,integer,numeric,numeric,text,text,uuid),
  trummcards_private.book_sale(uuid,date,integer,numeric,numeric,numeric,numeric,numeric,text,text,uuid),
  trummcards_private.void_sale(uuid) from public, anon, authenticated;
grant execute on function trummcards_private.book_purchase(uuid,date,integer,numeric,numeric,text,text,uuid),
  trummcards_private.book_sale(uuid,date,integer,numeric,numeric,numeric,numeric,numeric,text,text,uuid),
  trummcards_private.void_sale(uuid) to authenticated;
revoke all on function public.tc_book_purchase(uuid,date,integer,numeric,numeric,text,text,uuid),
  public.tc_book_sale(uuid,date,integer,numeric,numeric,numeric,numeric,numeric,text,text,uuid),
  public.tc_void_sale(uuid) from public, anon, authenticated;
grant execute on function public.tc_book_purchase(uuid,date,integer,numeric,numeric,text,text,uuid),
  public.tc_book_sale(uuid,date,integer,numeric,numeric,numeric,numeric,numeric,text,text,uuid),
  public.tc_void_sale(uuid) to authenticated;

-- Private Supabase Storage bucket: path format <owner-uuid>/<lot-uuid>/<image-uuid>.<ext>.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('trummcards-lot-images','trummcards-lot-images',false,10485760,
    array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy trummcards_images_read on storage.objects for select to authenticated
  using (bucket_id='trummcards-lot-images' and (select trummcards_private.is_owner())
    and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy trummcards_images_upload on storage.objects for insert to authenticated
  with check (bucket_id='trummcards-lot-images' and (select trummcards_private.is_owner())
    and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy trummcards_images_remove on storage.objects for delete to authenticated
  using (bucket_id='trummcards-lot-images' and (select trummcards_private.is_owner())
    and (storage.foldername(name))[1]=(select auth.uid())::text);
-- No update/upsert policy: immutability by unique image id avoids accidental overwrites.

commit;
