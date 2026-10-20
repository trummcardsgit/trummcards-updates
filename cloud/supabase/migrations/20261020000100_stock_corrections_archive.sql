-- Cloud 1.2.2: auditable stock corrections and safe inventory archiving.
-- Apply to TEST first. Production requires a separately approved data-preserving release.
begin;

alter table public.tc_products add column if not exists archived_at timestamptz;

alter table public.tc_stock_movements
  drop constraint if exists tc_stock_movements_movement_type_check;
alter table public.tc_stock_movements
  add constraint tc_stock_movements_movement_type_check
  check (movement_type in ('purchase','sale','sale_void','legacy_import','adjustment'));

create table if not exists public.tc_inventory_corrections (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete restrict,
  product_id uuid not null,
  action text not null check (action in ('adjust','archive')),
  previous_qty integer not null check (previous_qty >= 0),
  new_qty integer not null check (new_qty >= 0),
  cost_delta numeric(14,2) not null,
  reason text not null check (length(btrim(reason)) between 3 and 300),
  created_at timestamptz not null default now(),
  foreign key (product_id, owner_id)
    references public.tc_products(id, owner_id) on delete restrict
);
create index if not exists tc_inventory_corrections_product
  on public.tc_inventory_corrections(owner_id,product_id,created_at desc);
alter table public.tc_inventory_corrections enable row level security;
revoke all on public.tc_inventory_corrections from public, anon, authenticated;
grant select on public.tc_inventory_corrections to authenticated;
drop policy if exists tc_inventory_corrections_read on public.tc_inventory_corrections;
create policy tc_inventory_corrections_read
  on public.tc_inventory_corrections for select to authenticated
  using (owner_id=(select auth.uid()) and (select trummcards_private.is_owner()));

-- Stock adjustments use the SAME locked FIFO lots as the regular purchase/sale RPCs.
-- On decreases, consume newest inventory first to leave original FIFO lots intact.
-- Increases create a clearly marked correction lot; they are not cash purchases.
create or replace function trummcards_private.adjust_inventory(
  p_product_id uuid, p_expected_qty integer, p_target_qty integer,
  p_reason text, p_unit_cost numeric default null
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_before integer;
  v_delta integer;
  v_left integer;
  v_take integer;
  v_cost numeric(14,2);
  v_cost_sum numeric(14,2) := 0;
  v_unit numeric;
  v_total numeric;
  v_lot uuid;
  v_l record;
begin
  if v_user is null or not trummcards_private.is_owner() then
    raise exception 'Nicht autorisiert' using errcode='42501';
  end if;
  if p_product_id is null or p_expected_qty is null or p_expected_qty < 0
    or p_target_qty is null or p_target_qty < 0 or p_target_qty > 1000000
    or p_reason is null or length(btrim(p_reason)) not between 3 and 300
    or (p_unit_cost is not null and
      (p_unit_cost < 0 or p_unit_cost > 99999999 or p_unit_cost <> round(p_unit_cost,2))) then
    raise exception 'Ungültige Bestandskorrektur' using errcode='22023';
  end if;
  perform 1 from public.tc_products
    where id=p_product_id and owner_id=v_user and archived_at is null for update;
  if not found then raise exception 'Artikel nicht gefunden oder bereits entfernt' using errcode='P0002'; end if;
  select coalesce(sum(available_qty),0)::integer into v_before
    from public.tc_purchase_lots where owner_id=v_user and product_id=p_product_id;
  if v_before <> p_expected_qty then
    raise exception 'Bestand hat sich geändert. Bitte synchronisieren und erneut versuchen.'
      using errcode='40001';
  end if;
  v_delta := p_target_qty - v_before;
  if v_delta = 0 then return v_before; end if;
  if v_delta > 0 then
    select coalesce(sum(purchase_total+extra_cost-allocated_cost),0)
      into v_total from public.tc_purchase_lots
      where owner_id=v_user and product_id=p_product_id and available_qty>0;
    if p_unit_cost is not null then
      v_unit := p_unit_cost;
    elsif v_before > 0 then
      v_unit := round(v_total/v_before,2);
    else
      select round((purchase_total+extra_cost)/purchased_qty,2)
        into v_unit from public.tc_purchase_lots
        where owner_id=v_user and product_id=p_product_id
        order by bought_on desc,created_at desc,id desc limit 1;
      v_unit := coalesce(v_unit,0);
    end if;
    v_cost := round(v_unit*v_delta,2);
    if v_cost > 999999999999.99 then
      raise exception 'Korrekturwert zu groß' using errcode='22003';
    end if;
    insert into public.tc_purchase_lots
      (owner_id,product_id,bought_on,purchased_qty,available_qty,
       purchase_total,extra_cost,source,note,request_key)
    values (v_user,p_product_id,current_date,v_delta,v_delta,v_cost,0,
            'Bestandskorrektur',btrim(p_reason),gen_random_uuid())
    returning id into v_lot;
    insert into public.tc_stock_movements
      (owner_id,product_id,lot_id,movement_type,quantity_delta,cost_delta)
    values (v_user,p_product_id,v_lot,'adjustment',v_delta,v_cost);
    v_cost_sum := v_cost;
  else
    v_left := -v_delta;
    for v_l in
      select * from public.tc_purchase_lots
      where owner_id=v_user and product_id=p_product_id and available_qty>0
      order by bought_on desc,created_at desc,id desc for update
    loop
      exit when v_left=0;
      v_take := least(v_left,v_l.available_qty);
      if v_take=v_l.available_qty then
        v_cost := v_l.purchase_total+v_l.extra_cost-v_l.allocated_cost;
      else
        v_cost := least(
          round(((v_l.purchase_total+v_l.extra_cost)/v_l.purchased_qty)*v_take,2),
          v_l.purchase_total+v_l.extra_cost-v_l.allocated_cost
        );
      end if;
      update public.tc_purchase_lots
      set available_qty=available_qty-v_take,
          allocated_cost=allocated_cost+v_cost
      where id=v_l.id;
      insert into public.tc_stock_movements
        (owner_id,product_id,lot_id,movement_type,quantity_delta,cost_delta)
      values (v_user,p_product_id,v_l.id,'adjustment',-v_take,-v_cost);
      v_cost_sum := v_cost_sum-v_cost;
      v_left := v_left-v_take;
    end loop;
    if v_left<>0 then raise exception 'Bestand nicht konsistent' using errcode='P0001'; end if;
  end if;
  insert into public.tc_inventory_corrections
    (owner_id,product_id,action,previous_qty,new_qty,cost_delta,reason)
  values (v_user,p_product_id,'adjust',v_before,p_target_qty,v_cost_sum,btrim(p_reason));
  return p_target_qty;
end;
$$;

create or replace function trummcards_private.archive_product(
  p_product_id uuid,p_expected_qty integer,p_reason text
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid();v_before integer;
begin
  if v_user is null or not trummcards_private.is_owner() then
    raise exception 'Nicht autorisiert' using errcode='42501';
  end if;
  if p_reason is null or length(btrim(p_reason)) not between 3 and 260 then
    raise exception 'Grund angeben (3–300 Zeichen)' using errcode='22023';
  end if;
  perform 1 from public.tc_products
    where id=p_product_id and owner_id=v_user and archived_at is null for update;
  if not found then raise exception 'Artikel nicht gefunden oder bereits entfernt' using errcode='P0002'; end if;
  select coalesce(sum(available_qty),0)::integer into v_before
    from public.tc_purchase_lots where owner_id=v_user and product_id=p_product_id;
  if p_expected_qty is distinct from v_before then
    raise exception 'Bestand hat sich geändert. Bitte zuerst synchronisieren.'
      using errcode='40001';
  end if;
  if v_before>0 then
    perform trummcards_private.adjust_inventory(
      p_product_id,v_before,0,'Entfernung aus Lager: '||btrim(p_reason),null);
  end if;
  update public.tc_products
    set archived_at=now(),updated_at=now()
    where id=p_product_id and owner_id=v_user;
  insert into public.tc_inventory_corrections
    (owner_id,product_id,action,previous_qty,new_qty,cost_delta,reason)
  values (v_user,p_product_id,'archive',v_before,0,0,btrim(p_reason));
  return true;
end;
$$;

-- A subsequently cancelled historical sale can reintroduce stock to an archive.
-- Reactivate that card automatically so it never becomes invisible positive stock.
create or replace function trummcards_private.reactivate_on_restored_stock()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.tc_products
    set archived_at=null,updated_at=now()
    where id=new.product_id and owner_id=new.owner_id and archived_at is not null;
  return null;
end;
$$;
drop trigger if exists tc_reactivate_on_stock_return on public.tc_purchase_lots;
create trigger tc_reactivate_on_stock_return
  after update of available_qty on public.tc_purchase_lots
  for each row when (new.available_qty>old.available_qty)
  execute function trummcards_private.reactivate_on_restored_stock();
drop trigger if exists tc_reactivate_on_new_lot on public.tc_purchase_lots;
create trigger tc_reactivate_on_new_lot
  after insert on public.tc_purchase_lots
  for each row when (new.available_qty>0)
  execute function trummcards_private.reactivate_on_restored_stock();

create or replace function public.tc_adjust_inventory(
  p_product_id uuid,p_expected_qty integer,p_target_qty integer,
  p_reason text,p_unit_cost numeric default null
) returns integer language sql security invoker set search_path = '' as $$
  select trummcards_private.adjust_inventory(
    p_product_id,p_expected_qty,p_target_qty,p_reason,p_unit_cost);
$$;
create or replace function public.tc_archive_product(
  p_product_id uuid,p_expected_qty integer,p_reason text
) returns boolean language sql security invoker set search_path = '' as $$
  select trummcards_private.archive_product(p_product_id,p_expected_qty,p_reason);
$$;

revoke all on function trummcards_private.adjust_inventory(uuid,integer,integer,text,numeric),
  trummcards_private.archive_product(uuid,integer,text),
  trummcards_private.reactivate_on_restored_stock() from public,anon,authenticated;
grant execute on function trummcards_private.adjust_inventory(uuid,integer,integer,text,numeric),
  trummcards_private.archive_product(uuid,integer,text) to authenticated;
revoke all on function public.tc_adjust_inventory(uuid,integer,integer,text,numeric),
  public.tc_archive_product(uuid,integer,text) from public,anon,authenticated;
grant execute on function public.tc_adjust_inventory(uuid,integer,integer,text,numeric),
  public.tc_archive_product(uuid,integer,text) to authenticated;

commit;
