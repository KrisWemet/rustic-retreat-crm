-- A nightly camping register and private operations record for each wedding.
-- Arrival is inclusive; departure is the checkout date and is exclusive for
-- nightly capacity. The signed booking remains the source for
-- package charges; this migration does not invent nightly fees.
create table public.booking_camp_units (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  group_name text not null check (length(trim(group_name)) between 1 and 120),
  kind text not null check (kind in ('rv', 'tent')),
  unit_size_ft numeric(5,1) check (unit_size_ft > 0 and unit_size_ft <= 100),
  occupants integer not null check (occupants between 1 and 60),
  arrival_on date not null,
  departure_on date not null,
  contact_name text,
  contact_phone text,
  site_label text,
  notes text,
  created_at timestamptz not null default now(),
  check (departure_on > arrival_on)
);
create index booking_camp_units_booking on public.booking_camp_units (booking_id, arrival_on, departure_on);

create or replace function public.validate_booking_camp_unit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare booked public.bookings;
declare camp_total integer;
declare rv_total integer;
declare night date;
begin
  -- Locking the parent serializes concurrent register edits for one wedding.
  select * into booked from public.bookings where id = new.booking_id for update;
  if booked.id is null or booked.status <> 'confirmed' then
    raise exception 'Camping requires a confirmed booking';
  end if;
  if new.arrival_on < booked.start_date or new.departure_on > booked.end_date then
    raise exception 'Camping dates must stay within booked dates';
  end if;
  for night in select generate_series(new.arrival_on, new.departure_on - 1, interval '1 day')::date loop
    select coalesce(sum(occupants), 0), count(*) filter (where kind = 'rv')
      into camp_total, rv_total
      from public.booking_camp_units
      where booking_id = new.booking_id and id is distinct from new.id
        and arrival_on <= night and departure_on > night;
    if camp_total + new.occupants > 60 then
      raise exception 'Overnight camping exceeds 60 guests on %', night;
    end if;
    if rv_total + (case when new.kind = 'rv' then 1 else 0 end) > 15 then
      raise exception 'RV count exceeds 15 on %', night;
    end if;
  end loop;
  return new;
end $$;
create trigger booking_camp_unit_validate before insert or update on public.booking_camp_units
for each row execute function public.validate_booking_camp_unit();

create table public.booking_cabin_stay (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  guest_names text not null,
  occupants integer not null check (occupants between 1 and 4),
  arrival_on date not null,
  departure_on date not null,
  notes text,
  check (departure_on > arrival_on)
);
create or replace function public.validate_booking_cabin_stay() returns trigger
language plpgsql set search_path = '' as $$
declare booked public.bookings;
begin
  select * into booked from public.bookings where id = new.booking_id;
  if booked.id is null or booked.status <> 'confirmed'
    or new.arrival_on < booked.start_date or new.departure_on > booked.end_date then
    raise exception 'Cabin stay must fall within a confirmed booking';
  end if;
  return new;
end $$;
create trigger booking_cabin_stay_validate before insert or update on public.booking_cabin_stay
for each row execute function public.validate_booking_cabin_stay();

create table public.booking_vendor_arrivals (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  vendor_name text not null check (length(trim(vendor_name)) between 1 and 120),
  service text not null check (length(trim(service)) between 1 and 120),
  contact_name text,
  contact_phone text,
  arrival_at timestamptz not null,
  departure_at timestamptz,
  power_needs text,
  notes text,
  created_at timestamptz not null default now(),
  check (departure_at is null or departure_at >= arrival_at)
);
create index booking_vendor_arrivals_booking on public.booking_vendor_arrivals (booking_id, arrival_at);

create table public.booking_emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  role text not null check (length(trim(role)) between 1 and 120),
  phone text not null check (length(trim(phone)) between 1 and 50),
  notes text,
  created_at timestamptz not null default now()
);
create index booking_emergency_contacts_booking on public.booking_emergency_contacts (booking_id);

create table public.booking_ops_profile (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  weather_forecast text,
  weather_plan text,
  weather_decision text,
  weather_decided_at timestamptz,
  checkout_notes text,
  checkout_completed_at timestamptz,
  updated_at timestamptz not null default now(),
  check (weather_decided_at is null or nullif(trim(weather_decision), '') is not null)
);
create or replace function public.touch_booking_ops_profile() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger booking_ops_profile_touch before update on public.booking_ops_profile
for each row execute function public.touch_booking_ops_profile();

create table public.booking_ops_checks (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  code text not null,
  label text not null,
  area text not null check (area in ('setup', 'readiness', 'checkout')),
  owner text,
  notes text,
  completed_at timestamptz,
  unique (booking_id, code)
);
create or replace function public.seed_booking_ops_checks(p_booking_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.booking_ops_checks (booking_id, code, label, area) values
    (p_booking_id, 'water', 'Water supply and hot water checked', 'readiness'),
    (p_booking_id, 'wash_house', 'Wash house clean and stocked', 'readiness'),
    (p_booking_id, 'power', 'Solar and vendor power needs checked', 'readiness'),
    (p_booking_id, 'grounds', 'Grounds, paths, and ceremony area ready', 'setup'),
    (p_booking_id, 'supplies', 'Guest and cleaning supplies stocked', 'setup'),
    (p_booking_id, 'camping', 'Camping arrivals and RV placements reviewed', 'setup'),
    (p_booking_id, 'weather', 'Weather contingency reviewed', 'readiness'),
    (p_booking_id, 'checkout', 'Property and cabin inspected at checkout', 'checkout')
  on conflict (booking_id, code) do nothing;
end $$;
revoke all on function public.seed_booking_ops_checks(uuid) from public, anon, authenticated;
create or replace function public.seed_booking_ops_checks_on_booking() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'confirmed' then perform public.seed_booking_ops_checks(new.id); end if;
  return new;
end $$;
create trigger booking_ops_checks_seed after insert on public.bookings
for each row execute function public.seed_booking_ops_checks_on_booking();
select public.seed_booking_ops_checks(id) from public.bookings where status = 'confirmed';

create table public.booking_damage_deposit (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  agreed_cents integer not null check (agreed_cents >= 0),
  received_cents integer not null default 0 check (received_cents >= 0),
  received_at timestamptz,
  refunded_cents integer not null default 0 check (refunded_cents >= 0),
  refunded_at timestamptz,
  retained_cents integer not null default 0 check (retained_cents >= 0),
  notes text,
  updated_at timestamptz not null default now(),
  check (received_cents <= agreed_cents),
  check (refunded_cents + retained_cents <= received_cents),
  check ((received_cents = 0 and received_at is null) or (received_cents > 0 and received_at is not null)),
  check ((refunded_cents = 0 and refunded_at is null) or (refunded_cents > 0 and refunded_at is not null))
);
create or replace function public.touch_booking_damage_deposit() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger booking_damage_deposit_touch before update on public.booking_damage_deposit
for each row execute function public.touch_booking_damage_deposit();

-- Private Supabase Storage bucket. Never expose checkout photos as public URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wedding-inspections', 'wedding-inspections', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
create policy wedding_inspections_admin_select on storage.objects for select to authenticated
  using (bucket_id = 'wedding-inspections' and public.is_admin());
create policy wedding_inspections_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'wedding-inspections' and public.is_admin());
create policy wedding_inspections_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'wedding-inspections' and public.is_admin());

create table public.booking_inspection_photos (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  object_path text not null unique,
  caption text,
  created_at timestamptz not null default now(),
  check (object_path like booking_id::text || '/%')
);
create index booking_inspection_photos_booking on public.booking_inspection_photos (booking_id, created_at);

alter table public.booking_camp_units enable row level security;
alter table public.booking_cabin_stay enable row level security;
alter table public.booking_vendor_arrivals enable row level security;
alter table public.booking_emergency_contacts enable row level security;
alter table public.booking_ops_profile enable row level security;
alter table public.booking_ops_checks enable row level security;
alter table public.booking_damage_deposit enable row level security;
alter table public.booking_inspection_photos enable row level security;
create policy booking_camp_units_admin on public.booking_camp_units for all using (public.is_admin()) with check (public.is_admin());
create policy booking_cabin_stay_admin on public.booking_cabin_stay for all using (public.is_admin()) with check (public.is_admin());
create policy booking_vendor_arrivals_admin on public.booking_vendor_arrivals for all using (public.is_admin()) with check (public.is_admin());
create policy booking_emergency_contacts_admin on public.booking_emergency_contacts for all using (public.is_admin()) with check (public.is_admin());
create policy booking_ops_profile_admin on public.booking_ops_profile for all using (public.is_admin()) with check (public.is_admin());
create policy booking_ops_checks_admin on public.booking_ops_checks for all using (public.is_admin()) with check (public.is_admin());
create policy booking_damage_deposit_admin on public.booking_damage_deposit for all using (public.is_admin()) with check (public.is_admin());
create policy booking_inspection_photos_admin on public.booking_inspection_photos for all using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.booking_camp_units, public.booking_cabin_stay,
  public.booking_vendor_arrivals, public.booking_emergency_contacts, public.booking_ops_profile,
  public.booking_ops_checks, public.booking_damage_deposit, public.booking_inspection_photos to authenticated;

create or replace function public.log_booking_ops_change() returns trigger language plpgsql as $$
begin
  insert into public.booking_activity (booking_id, kind, details)
  values (coalesce(new.booking_id, old.booking_id), 'change', tg_argv[0] || ' ' || lower(tg_op));
  return coalesce(new, old);
end $$;
create trigger camp_unit_log after insert or update or delete on public.booking_camp_units
for each row execute function public.log_booking_ops_change('Camping register');
create trigger cabin_stay_log after insert or update or delete on public.booking_cabin_stay
for each row execute function public.log_booking_ops_change('Cabin stay');
create trigger vendor_arrival_log after insert or update or delete on public.booking_vendor_arrivals
for each row execute function public.log_booking_ops_change('Vendor schedule');
create trigger emergency_contact_log after insert or update or delete on public.booking_emergency_contacts
for each row execute function public.log_booking_ops_change('Emergency contact');
create trigger ops_profile_log after insert or update or delete on public.booking_ops_profile
for each row execute function public.log_booking_ops_change('Operations plan');
create trigger ops_check_log after update on public.booking_ops_checks
for each row execute function public.log_booking_ops_change('Readiness check');
create trigger damage_deposit_log after insert or update on public.booking_damage_deposit
for each row execute function public.log_booking_ops_change('Damage deposit record');
create trigger inspection_photo_log after insert or delete on public.booking_inspection_photos
for each row execute function public.log_booking_ops_change('Inspection photo');
