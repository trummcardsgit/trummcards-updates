-- TrummCards Cloud 1.3: isolated TEST rollout for Dex-only PWA access and personal card lists.
-- Existing owner guard, FIFO, inventory and finance tables remain unchanged.
create table if not exists trummcards_private.dex_viewers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  added_by uuid references auth.users(id) on delete set null
);
revoke all on trummcards_private.dex_viewers from public, anon, authenticated;

create table if not exists public.tc_personal_cards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  list_type text not null check (list_type in ('collection','wishlist')),
  name text not null check (length(btrim(name)) between 1 and 300),
  set_name text not null default '' check (length(set_name) <= 200),
  card_number text not null default '' check (length(card_number) <= 60),
  language text not null default 'Deutsch' check (length(language) <= 60),
  card_variant text not null default '' check (length(card_variant) <= 100),
  card_condition text not null default '' check (length(card_condition) <= 100),
  catalog_card_id text not null default '' check (length(catalog_card_id) <= 160),
  catalog_image_url text not null default ''
    check (catalog_image_url='' or (length(catalog_image_url)<=500
      and catalog_image_url ~ '^https://assets[.]tcgdex[.]net/[A-Za-z0-9/._-]+$')),
  quantity integer not null default 1 check (quantity between 1 and 10000),
  amount_eur numeric(12,2) check (amount_eur is null or amount_eur >= 0),
  priority smallint check (priority is null or priority between 1 and 3),
  note text not null default '' check (length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tc_personal_cards_owner_list on public.tc_personal_cards(owner_id,list_type,created_at desc);
alter table public.tc_personal_cards enable row level security;
create policy tc_personal_cards_select on public.tc_personal_cards
for select to authenticated using (owner_id = (select auth.uid()) and (select trummcards_private.is_owner()));
create policy tc_personal_cards_insert on public.tc_personal_cards
for insert to authenticated with check (owner_id = (select auth.uid()) and (select trummcards_private.is_owner()));
create policy tc_personal_cards_update on public.tc_personal_cards
for update to authenticated using (owner_id = (select auth.uid()) and (select trummcards_private.is_owner()))
with check (owner_id = (select auth.uid()) and (select trummcards_private.is_owner()));
create policy tc_personal_cards_delete on public.tc_personal_cards
for delete to authenticated using (owner_id = (select auth.uid()) and (select trummcards_private.is_owner()));
revoke all on public.tc_personal_cards from public,anon;
grant select,insert,update,delete on public.tc_personal_cards to authenticated;

create or replace function trummcards_private.pwa_role()
returns text language sql stable security definer set search_path = ''
as $$
 select case
   when (select trummcards_private.is_owner()) then 'admin'
   when exists (select 1 from trummcards_private.dex_viewers where user_id=(select auth.uid())) then 'dex'
   else null end;
$$;
revoke all on function trummcards_private.pwa_role() from public,anon;
grant execute on function trummcards_private.pwa_role() to authenticated;
create or replace function public.tc_pwa_access_role()
returns text language sql stable set search_path = ''
as $$ select trummcards_private.pwa_role(); $$;
revoke all on function public.tc_pwa_access_role() from public,anon;
grant execute on function public.tc_pwa_access_role() to authenticated;

-- The administrator creates/invites a Supabase Auth user first, then assigns a Dex-only role by email.
-- Never accept a target user_id or role from the client as authorization.
create or replace function trummcards_private.set_dex_viewer(p_email text,p_enable boolean)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_id uuid; v_email text := lower(btrim(p_email));
begin
 if not trummcards_private.is_owner() then
   raise exception 'Administratorzugang erforderlich' using errcode='42501';
 end if;
 if v_email is null or length(v_email)<3 or length(v_email)>320 or p_enable is null then
   raise exception 'Ungültige E-Mail oder Aktion' using errcode='22023';
 end if;
 select id into v_id from auth.users where lower(email)=v_email;
 if v_id is null then
   raise exception 'Benutzer nicht vorhanden. Erst in Supabase Authentication einladen.' using errcode='P0002';
 end if;
 if exists (select 1 from trummcards_private.owner_guard where user_id=v_id) then
   raise exception 'Administrator darf nicht als Dex-Benutzer verändert werden.' using errcode='42501';
 end if;
 if p_enable then
   insert into trummcards_private.dex_viewers(user_id,added_by) values(v_id,auth.uid())
   on conflict (user_id) do nothing;
 else
   delete from trummcards_private.dex_viewers where user_id=v_id;
 end if;
 return true;
end;
$$;
revoke all on function trummcards_private.set_dex_viewer(text,boolean) from public,anon;
grant execute on function trummcards_private.set_dex_viewer(text,boolean) to authenticated;
create or replace function public.tc_set_dex_viewer(p_email text,p_enable boolean)
returns boolean language sql set search_path=''
as $$ select trummcards_private.set_dex_viewer(p_email,p_enable); $$;
revoke all on function public.tc_set_dex_viewer(text,boolean) from public,anon;
grant execute on function public.tc_set_dex_viewer(text,boolean) to authenticated;

create or replace function trummcards_private.list_dex_viewers()
returns table(email text,created_at timestamptz)
language plpgsql stable security definer set search_path=''
as $$
begin
 if not trummcards_private.is_owner() then
   raise exception 'Administratorzugang erforderlich' using errcode='42501';
 end if;
 return query select u.email::text,v.created_at from trummcards_private.dex_viewers v
   join auth.users u on u.id=v.user_id order by v.created_at desc;
end;
$$;
revoke all on function trummcards_private.list_dex_viewers() from public,anon;
grant execute on function trummcards_private.list_dex_viewers() to authenticated;
create or replace function public.tc_list_dex_viewers()
returns table(email text,created_at timestamptz)
language sql stable set search_path=''
as $$ select * from trummcards_private.list_dex_viewers(); $$;
revoke all on function public.tc_list_dex_viewers() from public,anon;
grant execute on function public.tc_list_dex_viewers() to authenticated;
