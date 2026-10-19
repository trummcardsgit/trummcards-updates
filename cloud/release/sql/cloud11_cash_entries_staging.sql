-- STAGING ONLY: Cloud 1.1 cash-flow journal for optional Austrian E/A review.
-- Independent from inventory FIFO: purchase/sale bookings never auto-create cash movements.
-- Every cash movement is explicitly entered after actual payment, including partial payments.
create table public.tc_cash_entries (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id),
 payment_on date not null,
 direction text not null check (direction in ('income','expense')),
 category text not null check (category in (
  'sale_receipt','purchase_payment','platform_fee','shipping','business_expense','other_income','other_expense','refund')),
 constraint tc_cash_entries_category_direction_check check (
  (category in ('sale_receipt','other_income') and direction='income') or
  (category in ('purchase_payment','platform_fee','shipping','business_expense','other_expense') and direction='expense') or
  (category='refund' and direction in ('income','expense'))
 ),
 amount_eur numeric(12,2) not null check (amount_eur>0 and amount_eur<=9999999999.99),
 description text not null default '' check (length(description)<=500),
 document_reference text not null default '' check (length(document_reference)<=160),
 sale_id uuid,
 purchase_lot_id uuid,
 created_at timestamptz not null default now(),
 constraint tc_cash_entries_single_link check (sale_id is null or purchase_lot_id is null),
 constraint tc_cash_entries_sale_owner_fk foreign key (sale_id,owner_id)
  references public.tc_sales(id,owner_id) on update restrict on delete restrict,
 constraint tc_cash_entries_lot_owner_fk foreign key (purchase_lot_id,owner_id)
  references public.tc_purchase_lots(id,owner_id) on update restrict on delete restrict
);
create index tc_cash_entries_owner_date on public.tc_cash_entries(owner_id,payment_on desc);

alter table public.tc_cash_entries enable row level security;
revoke all on public.tc_cash_entries from public,anon,authenticated;
grant select on public.tc_cash_entries to authenticated;
grant insert (owner_id,payment_on,direction,category,amount_eur,description,document_reference,sale_id,purchase_lot_id)
 on public.tc_cash_entries to authenticated;
grant update (payment_on,direction,category,amount_eur,description,document_reference,sale_id,purchase_lot_id)
 on public.tc_cash_entries to authenticated;
grant delete on public.tc_cash_entries to authenticated;
create policy tc_cash_entries_read on public.tc_cash_entries
 for select to authenticated
 using (owner_id=(select auth.uid()) and (select trummcards_private.is_owner()));
create policy tc_cash_entries_insert on public.tc_cash_entries
 for insert to authenticated with check
 (owner_id=(select auth.uid()) and (select trummcards_private.is_owner()));
create policy tc_cash_entries_update on public.tc_cash_entries
 for update to authenticated
 using (owner_id=(select auth.uid()) and (select trummcards_private.is_owner()))
 with check (owner_id=(select auth.uid()) and (select trummcards_private.is_owner()));
create policy tc_cash_entries_delete on public.tc_cash_entries
 for delete to authenticated
 using (owner_id=(select auth.uid()) and (select trummcards_private.is_owner()));
comment on table public.tc_cash_entries is
 'Owner-entered actual payment movements, independent of FIFO ledgers. Reporting aid only; not certified Austrian tax accounting.';
