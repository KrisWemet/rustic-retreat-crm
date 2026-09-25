-- 02_roles_users_policies.sql
-- Purpose: Create user_role enum, public.users linked to auth.users, enable RLS,
-- and add admin-only access to inquiries as a starting point. Safe to run once.

-- Create role enum if missing
do $$
begin
  if not exists (select 1 from pg_type t where t.typname = 'user_role') then
    create type user_role as enum ('admin', 'client', 'family');
  end if;
end $$;

-- Users table mapped to auth.users
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'client',
  created_at timestamptz not null default now()
);

-- Enable RLS on users
alter table public.users enable row level security;

-- Policies for users
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'users' and policyname = 'users_self_upsert'
  ) then
    create policy users_self_upsert on public.users
      for all
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'users' and policyname = 'users_admin_all'
  ) then
    create policy users_admin_all on public.users
      for all
      using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
      with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));
  end if;
end $$;

-- Admin-only access to inquiries (adjust later for client/staff scoping)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'inquiries'
  ) then
    execute 'alter table public.inquiries enable row level security';

    if exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'inquiries' and policyname = 'inquiries_admin_all'
    ) then
      execute 'drop policy inquiries_admin_all on public.inquiries';
    end if;

    execute $POLICY$
      create policy inquiries_admin_all on public.inquiries
        for all
        using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
        with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));
    $POLICY$;
  end if;
end $$;

-- To grant admin role to a user after they sign in (replace UUID):
-- insert into public.users (id, role)
-- values ('00000000-0000-0000-0000-000000000000', 'admin')
-- on conflict (id) do update set role = excluded.role;
