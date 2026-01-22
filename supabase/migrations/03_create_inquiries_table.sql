-- 03_create_inquiries_table.sql
-- Purpose: Create a minimal inquiries table compatible with the app
-- (including created_at for sorting and status using inquiry_status enum).
-- Safe to run once.

-- Ensure pgcrypto is available for gen_random_uuid (typically enabled in Supabase)
create extension if not exists pgcrypto;

-- Create table if missing
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  wedding_date_estimate text,
  source text,
  status inquiry_status default 'new'::inquiry_status,
  notes text,
  created_at timestamptz not null default now()
);

-- Enable RLS and add admin-only policy if not already present
alter table public.inquiries enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'inquiries' and policyname = 'inquiries_admin_all'
  ) then
    execute $POLICY$
      create policy inquiries_admin_all on public.inquiries
        for all
        using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
        with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));
    $POLICY$;
  end if;
end $$;

