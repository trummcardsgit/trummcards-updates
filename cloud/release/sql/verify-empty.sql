-- Read-only go-live snapshot. Run ONLY in a NEW, isolated PRODUCTION
-- project, AFTER applying all three migrations. This is not an import or reset.
-- Expected: all app tables and storage objects = 0.
-- The Auth user and owner_guard entry may exist (ideally exactly one each).
SELECT 'tc_products' AS source, count(*)::bigint AS rows_found FROM public.tc_products
UNION ALL SELECT 'tc_purchase_lots', count(*) FROM public.tc_purchase_lots
UNION ALL SELECT 'tc_sales', count(*) FROM public.tc_sales
UNION ALL SELECT 'tc_sale_allocations', count(*) FROM public.tc_sale_allocations
UNION ALL SELECT 'tc_stock_movements', count(*) FROM public.tc_stock_movements
UNION ALL SELECT 'tc_lot_images', count(*) FROM public.tc_lot_images
UNION ALL SELECT 'tc_product_images', count(*) FROM public.tc_product_images
UNION ALL SELECT 'private_storage_objects', count(*) FROM storage.objects
WHERE bucket_id='trummcards-lot-images';

-- Verify owner registration independently from the empty business tables.
SELECT (SELECT count(*) FROM auth.users) AS auth_user_count,
       (SELECT count(*) FROM trummcards_private.owner_guard) AS owner_guard_count;

-- Check RLS is enabled on each TrummCards base table.
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'tc_%'
ORDER BY c.relname;

-- Private storage, not public.
SELECT id AS bucket_name, public AS is_public
FROM storage.buckets WHERE id='trummcards-lot-images';
