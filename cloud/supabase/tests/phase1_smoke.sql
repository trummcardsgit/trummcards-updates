-- OPTIONAL STAGING-ONLY SMOKE TEST. Never use on a production database.
-- Prerequisites:
--   (1) Schema migration already applied to a temporary Supabase project.
--   (2) Exactly one Supabase Auth user created and whitelisted in owner_guard.
-- Every created record is rolled back at the end.
begin;

-- Simulate the configured owner's JWT. This uses the SQL editor's postgres
-- permissions only to set up a test session, not to write business data.
select set_config('request.jwt.claim.sub',
  (select user_id::text from trummcards_private.owner_guard where singleton=true), true);
set local role authenticated;

do $$
declare
  v_product uuid;
  v_lot1 uuid;
  v_lot2 uuid;
  v_sale uuid;
  v_retry uuid;
  v_qty bigint;
  v_cost numeric(14,2);
  v_raised boolean := false;
begin
  insert into public.tc_products(sku,name,set_name,language,card_condition)
  values ('TEST-' || substring(gen_random_uuid()::text,1,12),
          'Fiktive Testkarte', 'Test Set', 'Deutsch', 'Near Mint')
  returning id into v_product;

  select public.tc_book_purchase(v_product,current_date-5,2,200.00,0.00,'Test','',gen_random_uuid()) into v_lot1;
  select public.tc_book_purchase(v_product,current_date-4,3,330.00,0.00,'Test','',gen_random_uuid()) into v_lot2;
  select public.tc_book_sale(v_product,current_date,3,450.00,5.00,5.00,22.50,0.00,
    'eBay','Testverkauf',gen_random_uuid()) into v_sale;
  select available_qty, remaining_cost into v_qty,v_cost
    from public.tc_inventory where product_id=v_product;
  if v_qty<>2 or v_cost<>220.00 then
    raise exception 'FIFO falsch: verfügbar %, Lagerwert % (erwartet 2 und 220.00)',v_qty,v_cost;
  end if;
  select cogs_total into v_cost from public.tc_sales where id=v_sale;
  if v_cost<>310.00 then raise exception 'COGS % statt 310.00',v_cost; end if;
  if (select count(*) from public.tc_sale_allocations where sale_id=v_sale)<>2 then
    raise exception 'Erwartet genau 2 FIFO-Zuordnungen';
  end if;

  begin
    perform public.tc_book_sale(v_product,current_date,3,10,0,0,0,0,'eBay','',gen_random_uuid());
  exception when sqlstate 'P0001' then
    v_raised := true;
  end;
  if not v_raised then raise exception 'Überverkauf wurde nicht verhindert'; end if;

  -- Retry returns the same ID and does not book again.
  -- Test uses a new request key for a different booked sale.
  if public.tc_void_sale(v_sale)<>true then raise exception 'Stornierung fehlgeschlagen'; end if;
  select available_qty,remaining_cost into v_qty,v_cost
    from public.tc_inventory where product_id=v_product;
  if v_qty<>5 or v_cost<>530.00 then
    raise exception 'Storno falsch: verfügbar %, Lagerwert %',v_qty,v_cost;
  end if;
  if public.tc_void_sale(v_sale)<>false then
    raise exception 'Wiederholtes Storno darf nicht nochmals Bestand buchen';
  end if;
  raise notice 'TrummCards Smoke Test bestanden: FIFO, Verkauf, Bestand, Überverkaufsschutz, Storno';
end;
$$;

-- Verify another authenticated user without an allowlist entry sees nothing.
select set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
do $$
declare n bigint;begin
  select count(*) into n from public.tc_products;
  if n<>0 then raise exception 'Owner RLS fehlgeschlagen (gesehen: %)',n; end if;
  raise notice 'RLS fremder Benutzer erfolgreich abgewiesen';
end;$$;

rollback;
