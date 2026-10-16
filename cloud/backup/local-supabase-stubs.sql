-- Temporary isolated PostgreSQL 17 surrogate for RESTORE TEST ONLY.
-- This is NOT a replacement for Supabase Auth/Storage in production.
create role anon;
create role authenticated;
create schema auth;
create table auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
create schema storage;
create table storage.buckets(
 id text primary key,
 name text not null,
 public boolean not null default false,
 file_size_limit bigint,
 allowed_mime_types text[]
);
create table storage.objects(
 id uuid primary key default gen_random_uuid(),
 bucket_id text not null references storage.buckets(id),
 name text not null,
 restored_sha256 text,
 restored_bytes bigint
);
alter table storage.objects enable row level security;
