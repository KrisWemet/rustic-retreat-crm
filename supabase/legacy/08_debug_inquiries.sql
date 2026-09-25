-- 08_debug_inquiries.sql
-- Purpose: Inspect the current shape of public.inquiries and related RLS to
-- help diagnose 500 errors from PostgREST. Safe to run; read-only queries.

-- 1) Does the table exist? Is it a table or view? Is RLS enabled?
select
  to_regclass('public.inquiries') as rel,
  c.relkind as kind,            -- 'r' table, 'v' view
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'inquiries';

-- 2) Column definitions for public.inquiries
select
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'inquiries'
order by ordinal_position;

-- 3) Try the same query the app runs (will expose DB error if any)
select *
from public.inquiries
order by created_at desc
limit 1;

-- 4) All RLS policies on inquiries
select policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'inquiries';

-- 5) Confirm admin row exists (Shannon)
select id, role from public.users
where id = '6ce07aac-8fa7-4153-97c1-f827b773f3b0';

