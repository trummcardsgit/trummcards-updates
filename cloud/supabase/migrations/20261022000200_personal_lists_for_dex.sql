-- Cloud 1.3: private lists belong to every activated TrummCards PWA account.
-- A Dex viewer can create/read/update/delete ONLY their own list entries.
-- Existing sales, FIFO, product, payments and image policies are untouched.
drop policy if exists tc_personal_cards_select on public.tc_personal_cards;
drop policy if exists tc_personal_cards_insert on public.tc_personal_cards;
drop policy if exists tc_personal_cards_update on public.tc_personal_cards;
drop policy if exists tc_personal_cards_delete on public.tc_personal_cards;

create policy tc_personal_cards_select on public.tc_personal_cards for select to authenticated
 using (owner_id = (select auth.uid()) and (select trummcards_private.pwa_role()) in ('admin','dex'));
create policy tc_personal_cards_insert on public.tc_personal_cards for insert to authenticated
 with check (owner_id = (select auth.uid()) and (select trummcards_private.pwa_role()) in ('admin','dex'));
create policy tc_personal_cards_update on public.tc_personal_cards for update to authenticated
 using (owner_id = (select auth.uid()) and (select trummcards_private.pwa_role()) in ('admin','dex'))
 with check (owner_id = (select auth.uid()) and (select trummcards_private.pwa_role()) in ('admin','dex'));
create policy tc_personal_cards_delete on public.tc_personal_cards for delete to authenticated
 using (owner_id = (select auth.uid()) and (select trummcards_private.pwa_role()) in ('admin','dex'));
