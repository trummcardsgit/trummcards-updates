-- Only for the isolated TEST Supabase project after phase1 schema is deployed.
-- Read-only authenticated session probe: returns boolean, never an owner UUID.
-- The private function checks the single-user allowlist with privileged access.
create or replace function public.tc_is_authorized()
returns boolean
language sql stable security invoker set search_path = '' as $$
  select trummcards_private.is_owner();
$$;
revoke all on function public.tc_is_authorized() from public, anon, authenticated;
grant execute on function public.tc_is_authorized() to authenticated;
