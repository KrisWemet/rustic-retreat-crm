-- A booking keeps the package terms agreed at creation. Existing rows have
-- unknown historical terms and must be reconciled against their contracts.
-- Only reviewed, versioned terms can be used in a new booking. The CRM's
-- TypeScript catalog mirrors these rows for display; the database is final.
create table if not exists public.booking_package_catalog (
  version text not null,
  season integer not null,
  package public.package_type not null,
  terms jsonb not null,
  primary key (version, season, package)
);
insert into public.booking_package_catalog (version, season, package, terms)
select '2026-09-23', offered.season, offered.package::public.package_type,
  jsonb_build_object(
    'version', '2026-09-23', 'season', offered.season,
    'package', offered.package, 'name', offered.name,
    'basePriceCents', offered.price, 'currency', 'CAD',
    'gstIncluded', false, 'campingIncluded', true,
    'includedReceptionGuests', 80, 'maximumReceptionGuests', 100,
    'includedCampingGuests', 60, 'includedRvs', 8, 'maximumRvs', 15)
from (values
  (2026, 'three_day', 'Classic 3-Day Weekend', 450000),
  (2026, 'five_day', 'Full 5-Day Experience', 550000),
  (2027, 'three_day', 'Classic 3-Day Weekend', 650000),
  (2027, 'five_day', 'Full 5-Day Experience', 750000)
) as offered(season, package, name, price)
on conflict (version, season, package) do nothing;
alter table public.booking_package_catalog enable row level security;
-- No client DML grant or policy: approved prices change only by migration.
create policy booking_package_catalog_admin_read on public.booking_package_catalog
  for select using (public.is_admin());
grant select on public.booking_package_catalog to authenticated;

alter table public.bookings
  add column if not exists package_terms jsonb,
  add column if not exists rv_count integer,
  add column if not exists reception_overage_rate_cents integer,
  add column if not exists reception_overage_total_cents integer generated always as (
    case when guest_reception_count > 80
      then (guest_reception_count - 80) * reception_overage_rate_cents
      else 0
    end
  ) stored;

alter table public.bookings
  add constraint bookings_rv_count_range check (rv_count between 0 and 15);

alter table public.bookings
  add constraint bookings_overage_rate_positive check (
    reception_overage_rate_cents is null or reception_overage_rate_cents > 0
  );

alter table public.bookings
  add constraint bookings_package_terms_shape check (
    package_terms is null or (
      package_terms ?& array['version', 'season', 'package', 'basePriceCents',
        'currency', 'gstIncluded', 'campingIncluded', 'includedReceptionGuests',
        'maximumReceptionGuests', 'includedCampingGuests',
        'includedRvs', 'maximumRvs']
      and package_terms->>'package' = package::text
      and package_terms->>'season' = left(start_date::text, 4)
      and (package_terms->>'basePriceCents')::integer >= 0
    )
  );

create or replace function public.require_booking_terms_snapshot()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.package = 'two_day' then
    raise exception 'The 2-day package is no longer offered';
  end if;
  if tg_op = 'INSERT' and new.package_terms is null then
    raise exception 'New bookings require a package terms snapshot';
  end if;
  if tg_op = 'INSERT' and new.rv_count is null then
    raise exception 'New bookings require an RV count';
  end if;
  if new.package_terms is not null then
    if not exists (
      select 1 from public.booking_package_catalog c
      where c.version = new.package_terms->>'version'
        and c.season = extract(year from new.start_date)
        and c.package = new.package
        and c.terms = new.package_terms
    ) then
      raise exception 'Package terms do not match an approved catalog version';
    end if;
    if new.guest_reception_count not between 0 and 100 then
      raise exception 'Reception guest count must be between 0 and 100';
    end if;
    if new.guest_camping_count not between 0 and 60 then
      raise exception 'Camping guest count must be between 0 and 60';
    end if;
    if new.guest_reception_count > 80 and new.reception_overage_rate_cents is null then
      raise exception 'A reception overage rate is required above 80 guests';
    end if;
    if new.guest_reception_count <= 80 and new.reception_overage_rate_cents is not null then
      raise exception 'Reception overage rate applies only above 80 guests';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if old.package_terms is not null and old.package_terms is distinct from new.package_terms then
      raise exception 'Package terms are immutable; create an explicit amendment instead';
    end if;
  end if;

  return new;
end;
$$;

create trigger require_booking_terms_snapshot
before insert or update on public.bookings
for each row execute function public.require_booking_terms_snapshot();
