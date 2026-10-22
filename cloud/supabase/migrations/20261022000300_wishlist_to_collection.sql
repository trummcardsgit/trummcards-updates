-- Cloud 1.3: transfer purchased wishlist cards into the signed-in user's collection.
-- Supports partial quantities, locks the wishlist row to prevent duplicate purchases,
-- and never touches sale/purchase/FIFO/inventory tables.
create or replace function public.tc_acquire_wishlist_card(
  p_wishlist_id uuid, p_quantity integer
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_row public.tc_personal_cards%rowtype;
  v_new uuid;
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or (select trummcards_private.pwa_role()) not in ('admin','dex') then
    raise exception 'Nicht für die Sammlungsverwaltung autorisiert.' using errcode = '42501';
  end if;
  if p_wishlist_id is null or p_quantity is null or p_quantity < 1 or p_quantity > 10000 then
    raise exception 'Ungültige Stückzahl.' using errcode = '22023';
  end if;

  select * into v_row from public.tc_personal_cards
  where id = p_wishlist_id and owner_id = v_uid and list_type = 'wishlist'
  for update;
  if not found then
    raise exception 'Wunschlisteneintrag nicht gefunden oder kein Zugriff.' using errcode = 'P0002';
  end if;
  if p_quantity > v_row.quantity then
    raise exception 'Es sind nur % Stück auf der Wunschliste.', v_row.quantity using errcode = '22023';
  end if;

  insert into public.tc_personal_cards(
    owner_id,list_type,name,set_name,card_number,language,card_variant,
    card_condition,catalog_card_id,catalog_image_url,quantity,amount_eur,note
  ) values (
    v_uid,'collection',v_row.name,v_row.set_name,v_row.card_number,
    v_row.language,v_row.card_variant,v_row.card_condition,
    v_row.catalog_card_id,v_row.catalog_image_url,p_quantity,v_row.amount_eur,v_row.note
  ) returning id into v_new;

  if p_quantity = v_row.quantity then
    delete from public.tc_personal_cards where id = v_row.id and owner_id = v_uid;
  else
    update public.tc_personal_cards
    set quantity = quantity - p_quantity, updated_at = now()
    where id = v_row.id and owner_id = v_uid;
  end if;
  return v_new;
end;
$$;

revoke all on function public.tc_acquire_wishlist_card(uuid,integer) from public,anon;
grant execute on function public.tc_acquire_wishlist_card(uuid,integer) to authenticated;
