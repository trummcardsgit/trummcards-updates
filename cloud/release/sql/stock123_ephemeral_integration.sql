-- Cloud 1.2.3 end-to-end regression on disposable PostgreSQL 17 only.
begin;
set local request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';

insert into public.tc_products(id,owner_id,name) values (
 '10000000-0000-4000-8000-000000000001',
 '00000000-0000-4000-8000-000000000001',
 'Test-Pokemon'
);
insert into public.tc_purchase_lots(
 id,owner_id,product_id,bought_on,purchased_qty,available_qty,
 purchase_total,extra_cost,allocated_cost,source,note,request_key)
values (
 '20000000-0000-4000-8000-000000000001',
 '00000000-0000-4000-8000-000000000001',
 '10000000-0000-4000-8000-000000000001',
 '2026-10-01',4,4,40,0,0,'Testlieferant','',gen_random_uuid()
);
insert into public.tc_sales(
 id,owner_id,product_id,sold_on,qty,status)
values (
 '30000000-0000-4000-8000-000000000001',
 '00000000-0000-4000-8000-000000000001',
 '10000000-0000-4000-8000-000000000001',
 '2026-10-02',1,'booked'
);

do $test$
declare
 p constant uuid:='10000000-0000-4000-8000-000000000001';
 n integer;
begin
 -- Decrease: keep lot history and cost consistency.
 n:=public.tc_adjust_inventory(p,4,2,'Inventurkorrektur',null);
 if n<>2 then raise exception 'Reduction gave %, expected 2',n;end if;
 if not exists(select 1 from public.tc_purchase_lots
     where product_id=p and available_qty=2 and allocated_cost=20
       and purchase_total=40) then
   raise exception 'Original FIFO lot not adjusted consistently';
 end if;
 if not exists(select 1 from public.tc_stock_movements
     where product_id=p and movement_type='adjustment'
       and quantity_delta=-2 and cost_delta=-20) then
   raise exception 'Adjustment outflow not audited';
 end if;

 -- Stale expected quantity must never overwrite concurrent changes.
 begin
   perform public.tc_adjust_inventory(p,4,1,'Veraltete Zählung',null);
   raise exception 'Stale count did not fail';
 exception when sqlstate '40001' then null;
 end;

 -- Increasing stock does NOT book a new cash purchase.
 n:=public.tc_adjust_inventory(p,2,5,'Nachgezählt',null);
 if n<>5 then raise exception 'Increase gave %, expected 5',n;end if;
 if not exists(select 1 from public.tc_purchase_lots
   where product_id=p and source='Bestandskorrektur'
     and available_qty=3 and purchase_total=30) then
   raise exception 'Cost-neutral correction lot missing';
 end if;
 if (select count(*) from public.tc_inventory_corrections
    where product_id=p and action='adjust')<>2 then
   raise exception 'Expected exactly two correction audit records';
 end if;

 -- Explicit archive reduces stock to zero but retains purchases, sales and audit.
 if not public.tc_archive_product(p,5,'Sortiment bereinigt') then
   raise exception 'Archive returned false';
 end if;
 if (select archived_at from public.tc_products where id=p) is null then
   raise exception 'Article was not archived';
 end if;
 if (select coalesce(sum(available_qty),0) from public.tc_purchase_lots
   where product_id=p)<>0 then
   raise exception 'Archived item retains positive inventory';
 end if;
 if (select count(*) from public.tc_sales where product_id=p)<>1 then
   raise exception 'Historical sale unexpectedly removed';
 end if;
 if (select count(*) from public.tc_inventory_corrections
   where product_id=p and action='archive')<>1 then
   raise exception 'Archive audit record missing';
 end if;

 -- Existing void_sale raises lot available qty, trigger reactivates product.
 update public.tc_purchase_lots
   set available_qty=1,allocated_cost=30
   where id='20000000-0000-4000-8000-000000000001';
 if (select archived_at from public.tc_products where id=p) is not null then
   raise exception 'Returned stock did not reactivate archived card';
 end if;

 -- Check owner guard: wrong user cannot correct inventory.
 perform set_config('request.jwt.claim.sub',
    '00000000-0000-4000-8000-000000000002',true);
 begin
   perform public.tc_adjust_inventory(p,1,0,'Fremdzugriff',null);
   raise exception 'Access without owner_guard wrongly succeeded';
 exception when sqlstate '42501' then null;
 end;
end;
$test$;

-- All tests run inside a rollback-only transaction, leaving NO persistent rows.
rollback;
