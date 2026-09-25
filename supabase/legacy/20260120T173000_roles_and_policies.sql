-- Migration: Roles, users table mapping, and RLS policy skeletons

-- 1) Create role enum if missing
do $$
begin
  if not exists (select 1 from pg_type t where t.typname = 'user_role') then
    create type user_role as enum ('admin', 'client', 'family');
  end if;
end $$;

-- 2) Create users table mapped to auth.users
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'client',
  created_at timestamptz not null default now()
);

-- 3) Enable RLS
alter table public.users enable row level security;

-- 4) Policies for public.users
do $$
begin
  -- Upsert owner row: a user can insert/update their own profile row
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'users' and policyname = 'users_self_upsert'
  ) then
    create policy users_self_upsert on public.users
      for all
      using (id = auth.uid())
      with check (id = auth.uid());
  end if;

  -- Admin can do anything on users
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'users' and policyname = 'users_admin_all'
  ) then
    create policy users_admin_all on public.users
      for all
      using (exists (
        select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'
      ))
      with check (exists (
        select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'
      ));
  end if;
end $$;

-- 5) RLS on inquiries: admin-only access by default
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'inquiries'
  ) then
    -- enable RLS
    execute 'alter table public.inquiries enable row level security';

    -- Drop existing policies if they collide with names
    if exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'inquiries' and policyname = 'inquiries_admin_all'
    ) then
      execute 'drop policy inquiries_admin_all on public.inquiries';
    end if;

    -- Admin full access policy
    execute $$
      create policy inquiries_admin_all on public.inquiries
        for all
        using (exists (
          select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'
        ))
        with check (exists (
          select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'
        ));
    $$;
  end if;
end $$;

-- NOTE: Seed an admin user row after first login to enable admin access, e.g.:
-- insert into public.users (id, role) values ('<auth_user_id>', 'admin')
-- on conflict (id) do update set role = excluded.role;

