-- Normalized baseline for the older hand-applied CRM schema. Supabase Auth
-- provisions auth.users and auth.uid(); this migration does not seed an admin.
create extension if not exists pgcrypto;

-- Both the historical and current pipeline values remain readable.
do $$ begin
  if not exists (select 1 from pg_type where typname = 'inquiry_status' and typnamespace = 'public'::regnamespace) then
    create type public.inquiry_status as enum (
      'new', 'viewing_scheduled', 'viewed', 'booked', 'lost', 'inquiry',
      'tour_scheduled', 'approved', 'contract_sent', 'contract_signed',
      'booking_confirmed', 'pre_event_checklist', 'event_week', 'post_event_inspection');
  end if;
  if not exists (select 1 from pg_type where typname = 'user_role' and typnamespace = 'public'::regnamespace) then
    create type public.user_role as enum ('admin', 'client', 'family');
  end if;
  if not exists (select 1 from pg_type where typname = 'package_type' and typnamespace = 'public'::regnamespace) then
    create type public.package_type as enum ('two_day', 'three_day', 'five_day');
  end if;
end $$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'client',
  created_at timestamptz not null default now()
);
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  wedding_date_estimate text,
  source text,
  status public.inquiry_status default 'new',
  notes text,
  created_at timestamptz not null default now()
);
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid references public.inquiries(id) on delete set null,
  client_user_id uuid references public.users(id) on delete set null,
  package public.package_type not null,
  start_date date not null,
  end_date date not null,
  guest_reception_count integer not null default 0,
  guest_camping_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inquiries add column if not exists created_at timestamptz not null default now();
alter table public.inquiries alter column id set default gen_random_uuid();
do $$ begin
  if exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inquiries'
      and column_name = 'status' and data_type <> 'USER-DEFINED') then
    alter table public.inquiries alter column status drop default;
    alter table public.inquiries alter column status type public.inquiry_status using (
      case lower(status::text)
        when 'viewing_scheduled' then 'viewing_scheduled'::public.inquiry_status
        when 'viewed' then 'viewed'::public.inquiry_status
        when 'booked' then 'booked'::public.inquiry_status
        when 'lost' then 'lost'::public.inquiry_status
        when 'inquiry' then 'inquiry'::public.inquiry_status
        when 'tour_scheduled' then 'tour_scheduled'::public.inquiry_status
        when 'approved' then 'approved'::public.inquiry_status
        when 'contract_sent' then 'contract_sent'::public.inquiry_status
        when 'contract_signed' then 'contract_signed'::public.inquiry_status
        when 'booking_confirmed' then 'booking_confirmed'::public.inquiry_status
        when 'pre_event_checklist' then 'pre_event_checklist'::public.inquiry_status
        when 'event_week' then 'event_week'::public.inquiry_status
        when 'post_event_inspection' then 'post_event_inspection'::public.inquiry_status
        else 'new'::public.inquiry_status end);
  end if;
end $$;
alter table public.inquiries alter column status set default 'new'::public.inquiry_status;
update public.inquiries set status = 'new' where status is null;
create index if not exists idx_inquiries_created_at on public.inquiries (created_at desc);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.users where id = (select auth.uid()) and role = 'admin');
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

alter table public.users enable row level security;
alter table public.inquiries enable row level security;
alter table public.bookings enable row level security;
drop policy if exists users_self_upsert on public.users;
drop policy if exists users_admin_all on public.users;
drop policy if exists users_self_read on public.users;
drop policy if exists users_self_insert_client on public.users;
create policy users_admin_all on public.users for all using (public.is_admin()) with check (public.is_admin());
create policy users_self_read on public.users for select using (id = auth.uid());
create policy users_self_insert_client on public.users for insert with check (id = auth.uid() and role = 'client');
drop policy if exists inquiries_admin_all on public.inquiries;
create policy inquiries_admin_all on public.inquiries for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists bookings_admin_all on public.bookings;
create policy bookings_admin_all on public.bookings for all using (public.is_admin()) with check (public.is_admin());

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.inquiries, public.bookings to authenticated;
grant select, insert, update, delete on public.users to authenticated;
