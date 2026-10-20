-- Minimal synthetic schema for the Cloud 1.2.3 migration integration test.
-- Runs ONLY against a disposable PostgreSQL service in GitHub Actions.
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $authuid$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$authuid$;

create schema trummcards_private;
create table trummcards_private.owner_guard(user_id uuid primary key references auth.users(id));
create function trummcards_private.is_owner() returns boolean language sql stable as $owner$
  select exists(select 1 from trummcards_private.owner_guard where user_id=auth.uid())
$owner$;

create table public.tc_products(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 name text not null,
 updated_at timestamptz not null default now(),
 unique(id,owner_id)
);
create table public.tc_purchase_lots(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 product_id uuid not null,
 bought_on date not null,
 purchased_qty integer not null check(purchased_qty>0),
 available_qty integer not null check(available_qty>=0 and available_qty<=purchased_qty),
 purchase_total numeric(14,2) not null check(purchase_total>=0),
 extra_cost numeric(14,2) not null default 0,
 allocated_cost numeric(14,2) not null default 0,
 source text not null default '',
 note text not null default '',
 request_key uuid not null,
 created_at timestamptz not null default now(),
 foreign key(product_id,owner_id) references public.tc_products(id,owner_id),
 check(allocated_cost<=purchase_total+extra_cost),
 check(available_qty>0 or allocated_cost=purchase_total+extra_cost)
);
create table public.tc_stock_movements(
 id bigint generated always as identity primary key,
 owner_id uuid not null,
 product_id uuid not null,
 lot_id uuid not null,
 movement_type text not null
  constraint tc_stock_movements_movement_type_check
  check(movement_type in ('purchase','sale','sale_void','legacy_import')),
 quantity_delta integer not null check(quantity_delta<>0),
 cost_delta numeric(14,2) not null,
 created_at timestamptz not null default now()
);
insert into auth.users(id) values
 ('00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000002');
insert into trummcards_private.owner_guard(user_id)
values ('00000000-0000-4000-8000-000000000001');
