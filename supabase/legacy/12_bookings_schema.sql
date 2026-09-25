-- 12_bookings_schema.sql
-- Purpose: Create bookings schema, package enum, and basic RLS for admin.

do $$
begin
  if not exists (select 1 from pg_type t where t.typname = 'package_type') then
    create type package_type as enum ('two_day', 'three_day', 'five_day');
  end if;
end $$;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid null references public.inquiries(id) on delete set null,
  client_user_id uuid null references public.users(id) on delete set null,
  package package_type not null,
  start_date date not null,
  end_date date not null,
  guest_reception_count int not null default 0,
  guest_camping_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'bookings' and policyname = 'bookings_admin_all'
  ) then
    create policy bookings_admin_all on public.bookings
      for all
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end $$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.bookings to authenticated;

