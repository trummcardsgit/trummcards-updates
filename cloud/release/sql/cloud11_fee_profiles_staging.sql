-- Cloud 1.1 optional user-customized platform fee rules, STAGING ONLY.
-- Percent and fixed fees are estimates: each sale can override the suggested fee.
-- Owner-specific settings are never shared across users, no third-party APIs used.
create table public.tc_platform_fee_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  platform text not null check (length(platform) between 1 and 100),
  percent_rate numeric(5,2) not null default 0 check (percent_rate between 0 and 100),
  fixed_eur numeric(12,2) not null default 0 check (fixed_eur between 0 and 999999.99),
  include_shipping boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (owner_id,platform)
);
create index tc_platform_fee_profiles_owner on public.tc_platform_fee_profiles(owner_id);

alter table public.tc_platform_fee_profiles enable row level security;
revoke all on public.tc_platform_fee_profiles from public,anon,authenticated;
grant select on public.tc_platform_fee_profiles to authenticated;
grant insert (owner_id,platform,percent_rate,fixed_eur,include_shipping)
 on public.tc_platform_fee_profiles to authenticated;
grant update (percent_rate,fixed_eur,include_shipping,updated_at)
 on public.tc_platform_fee_profiles to authenticated;
create policy tc_platform_fee_profiles_read on public.tc_platform_fee_profiles
  for select to authenticated using (
    owner_id=(select auth.uid()) and (select trummcards_private.is_owner()));
create policy tc_platform_fee_profiles_insert on public.tc_platform_fee_profiles
  for insert to authenticated with check (
    owner_id=(select auth.uid()) and (select trummcards_private.is_owner()));
create policy tc_platform_fee_profiles_update on public.tc_platform_fee_profiles
  for update to authenticated using (
    owner_id=(select auth.uid()) and (select trummcards_private.is_owner()))
  with check (owner_id=(select auth.uid()) and (select trummcards_private.is_owner()));
comment on table public.tc_platform_fee_profiles is
 'User-controlled platform fee estimates only, not official current commission schedules. Per-sale manual override is always allowed.';
