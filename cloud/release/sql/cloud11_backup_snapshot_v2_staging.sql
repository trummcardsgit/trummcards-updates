-- STAGED replacement after the new backup verifier accepts v1 + v2. DO NOT RUN AGAINST PROD until coordinated upgrade.
-- TrummCards Cloud 1.1: read-only, owner-scoped consistent snapshot for encrypted offsite backups.
-- The returned JSON includes only the authenticated owner's business records and image metadata.
-- Blob bytes are fetched separately from the private storage bucket by an authenticated backup client.
-- This migration neither alters nor deletes any existing records.
create or replace function public.tc_backup_snapshot()
returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
declare v_owner uuid := (select auth.uid());
begin
  if v_owner is null or not (select trummcards_private.is_owner()) then
    raise exception 'Backup nur für den freigeschalteten Eigentümer erlaubt' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'format', 'trummcards-cloud-backup-v2',
    'captured_at', transaction_timestamp(),
    'owner_id', v_owner,
    'tables', jsonb_build_object(
    'tc_products', (select coalesce(jsonb_agg(to_jsonb(x) order by x.id), '[]'::jsonb)
              from public.tc_products x where x.owner_id = v_owner),
    'tc_purchase_lots', (select coalesce(jsonb_agg(to_jsonb(x) order by x.id), '[]'::jsonb)
              from public.tc_purchase_lots x where x.owner_id = v_owner),
    'tc_sales', (select coalesce(jsonb_agg(to_jsonb(x) order by x.id), '[]'::jsonb)
              from public.tc_sales x where x.owner_id = v_owner),
    'tc_sale_allocations', (select coalesce(jsonb_agg(to_jsonb(x) order by x.id), '[]'::jsonb)
              from public.tc_sale_allocations x where x.owner_id = v_owner),
    'tc_stock_movements', (select coalesce(jsonb_agg(to_jsonb(x) order by x.id), '[]'::jsonb)
              from public.tc_stock_movements x where x.owner_id = v_owner),
    'tc_lot_images', (select coalesce(jsonb_agg(to_jsonb(x) order by x.id), '[]'::jsonb)
              from public.tc_lot_images x where x.owner_id = v_owner),
    'tc_product_images', (select coalesce(jsonb_agg(to_jsonb(x) order by x.id), '[]'::jsonb)
              from public.tc_product_images x where x.owner_id = v_owner),
    'tc_sale_shipments', (select coalesce(jsonb_agg(to_jsonb(x) order by x.sale_id), '[]'::jsonb)
              from public.tc_sale_shipments x where x.owner_id = v_owner),
    'tc_platform_fee_profiles', (select coalesce(jsonb_agg(to_jsonb(x) order by x.id), '[]'::jsonb)
              from public.tc_platform_fee_profiles x where x.owner_id = v_owner),
    'tc_cash_entries', (select coalesce(jsonb_agg(to_jsonb(x) order by x.id), '[]'::jsonb)
              from public.tc_cash_entries x where x.owner_id = v_owner)
    )
  );
end;
$$;
revoke all on function public.tc_backup_snapshot() from public, anon, authenticated;
grant execute on function public.tc_backup_snapshot() to authenticated;
