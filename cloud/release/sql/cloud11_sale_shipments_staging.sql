-- Cloud 1.1 SHIPPING (staging SQL, NOT applied to Supabase Production).
-- Separate from tc_sales: booking, void, revenue, cost and FIFO stay RPC-only.
create table public.tc_sale_shipments (
  sale_id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users(id),
  shipping_status text not null default 'offen' check (shipping_status in ('offen','verpackt','versendet','zugestellt')),
  carrier text not null default '' check (length(carrier)<=100),
  tracking_number text not null default '' check (length(tracking_number)<=150),
  order_reference text not null default '' check (length(order_reference)<=150),
  shipped_on date,
  tracking_url text not null default '' check (
    length(tracking_url)<=500 and
    (tracking_url='' or tracking_url ~ '^https://[^[:space:]/?#@]+[.]?[A-Za-z0-9.-]+([/?#][^[:space:]]*)?$')
  ),
  updated_at timestamptz not null default now(),
  constraint tc_sale_shipments_sale_owner_fk
    foreign key (sale_id,owner_id) references public.tc_sales(id,owner_id)
    on update restrict on delete restrict
);
create index tc_sale_shipments_owner on public.tc_sale_shipments(owner_id);

alter table public.tc_sale_shipments enable row level security;
revoke all on public.tc_sale_shipments from PUBLIC,anon,authenticated;
grant select on public.tc_sale_shipments to authenticated;
grant insert (sale_id,owner_id,shipping_status,carrier,tracking_number,order_reference,shipped_on,tracking_url)
  on public.tc_sale_shipments to authenticated;
grant update (shipping_status,carrier,tracking_number,order_reference,shipped_on,tracking_url,updated_at)
  on public.tc_sale_shipments to authenticated;

create policy tc_shipments_read on public.tc_sale_shipments
  for select to authenticated
  using (owner_id=(select auth.uid()) and (select trummcards_private.is_owner()));
create policy tc_shipments_insert on public.tc_sale_shipments
  for insert to authenticated
  with check (owner_id=(select auth.uid()) and (select trummcards_private.is_owner()));
create policy tc_shipments_update on public.tc_sale_shipments
  for update to authenticated
  using (owner_id=(select auth.uid()) and (select trummcards_private.is_owner()))
  with check (owner_id=(select auth.uid()) and (select trummcards_private.is_owner()));

-- Shipments are metadata for EXISTING sales, no INSERT/UPDATE/DELETE access to tc_sales is changed.
comment on table public.tc_sale_shipments is
  'Optional order/shipping metadata per sale. Does not change FIFO or sale status. No buyer personal data required.';
