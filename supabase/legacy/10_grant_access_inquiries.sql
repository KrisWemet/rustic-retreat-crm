-- 10_grant_access_inquiries.sql
-- Purpose: Ensure authenticated role has required privileges for PostgREST.
-- Note: RLS still applies; these grants allow access subject to policies.

-- Schema usage
grant usage on schema public to authenticated;

-- Table privileges for authenticated users
grant select, insert, update, delete on table public.inquiries to authenticated;

-- Optionally allow anon to read if desired (commented out by default)
-- grant usage on schema public to anon;
-- grant select on table public.inquiries to anon;

