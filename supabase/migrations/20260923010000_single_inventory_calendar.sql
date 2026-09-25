-- One inventory for confirmed weddings, expiring holds, and owner blackouts.
-- Dates are inclusive. Bookings and holds reserve the following reset day.

-- Booking RPCs rely on is_admin(). Remove the earlier self-upsert policy,
-- which allowed clients to change their own role to admin.
drop policy if exists users_self_upsert on public.users;
drop policy if exists users_admin_all on public.users;
drop policy if exists users_self_read on public.users;
drop policy if exists users_self_insert_client on public.users;
create policy users_admin_all on public.users
  for all using (public.is_admin()) with check (public.is_admin());
create policy users_self_read on public.users
  for select using (id = auth.uid());
create policy users_self_insert_client on public.users
  for insert with check (id = auth.uid() and role = 'client');

alter table public.bookings
  add column if not exists status text not null default 'confirmed';

alter table public.bookings
  add constraint bookings_status_valid check (status in ('confirmed', 'cancelled'));

create unique index if not exists bookings_one_confirmed_per_inquiry
  on public.bookings (inquiry_id)
  where inquiry_id is not null and status = 'confirmed';

create table public.calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid unique references public.bookings(id) on delete cascade,
  inquiry_id uuid references public.inquiries(id) on delete set null,
  kind text not null check (kind in ('booking', 'hold', 'blackout')),
  state text not null default 'active' check (state in ('active', 'released', 'expired')),
  start_date date not null,
  end_date date not null,
  expires_at timestamptz,
  label text not null default '',
  created_at timestamptz not null default now(),
  occupied_range daterange generated always as (
    case when kind = 'blackout'
      then daterange(start_date, end_date + 1, '[)')
      else daterange(start_date, end_date + 2, '[)')
    end
  ) stored,
  constraint calendar_block_dates_valid check (end_date >= start_date),
  constraint calendar_block_shape check (
    (kind = 'booking' and booking_id is not null and expires_at is null)
    or (kind = 'hold' and booking_id is null and expires_at is not null)
    or (kind = 'blackout' and booking_id is null and expires_at is null)
  )
);

alter table public.calendar_blocks
  add constraint calendar_blocks_no_overlap
  exclude using gist (occupied_range with &&)
  where (state = 'active');

create index calendar_blocks_dates_idx on public.calendar_blocks (start_date, end_date);
create index calendar_blocks_expiring_holds_idx on public.calendar_blocks (expires_at)
  where kind = 'hold' and state = 'active';

alter table public.calendar_blocks enable row level security;
create policy calendar_blocks_admin_read on public.calendar_blocks
  for select using (public.is_admin());
grant select on public.calendar_blocks to authenticated;
revoke insert, update, delete on public.calendar_blocks from anon, authenticated;

-- Existing bookings become active blocks. A conflict fails this migration so it
-- can be resolved against the original contracts before the constraint is live.
insert into public.calendar_blocks (booking_id, inquiry_id, kind, state, start_date, end_date, label)
select b.id, b.inquiry_id, 'booking', 'active', b.start_date, b.end_date, 'Confirmed booking'
from public.bookings b
where b.status = 'confirmed';

create or replace function public.enforce_booking_window()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  start_day integer;
begin
  if new.package_terms is null then
    return new; -- Historical bookings keep their original contract terms.
  end if;

  start_day := extract(dow from new.start_date);
  if new.package = 'three_day' then
    if start_day <> 5 or new.end_date <> new.start_date + 2 then
      raise exception '3-day bookings must run Friday through Sunday';
    end if;
  elsif new.package = 'five_day' then
    if start_day not in (3, 4, 5) or new.end_date <> new.start_date + 4 then
      raise exception '5-day bookings must run Wed-Sun, Thu-Mon, or Fri-Tue';
    end if;
  else
    raise exception 'The 2-day package is no longer offered for new bookings';
  end if;
  return new;
end;
$$;

create trigger enforce_booking_window
before insert or update of package, package_terms, start_date, end_date on public.bookings
for each row execute function public.enforce_booking_window();

create or replace function public.sync_booking_calendar_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.calendar_blocks (booking_id, inquiry_id, kind, state, start_date, end_date, label)
  values (
    new.id, new.inquiry_id, 'booking',
    case when new.status = 'confirmed' then 'active' else 'released' end,
    new.start_date, new.end_date, 'Confirmed booking'
  )
  on conflict (booking_id) do update set
    inquiry_id = excluded.inquiry_id,
    state = excluded.state,
    start_date = excluded.start_date,
    end_date = excluded.end_date;
  return new;
end;
$$;

create trigger sync_booking_calendar_block
after insert or update of status, start_date, end_date, inquiry_id on public.bookings
for each row execute function public.sync_booking_calendar_block();

-- One transaction owns the inquiry, releases its hold, reserves the calendar,
-- and updates the sales pipeline. A GiST exclusion conflict aborts everything.
create or replace function public.confirm_booking_from_inquiry(
  p_inquiry_id uuid,
  p_package public.package_type,
  p_start_date date,
  p_end_date date,
  p_guest_reception_count integer,
  p_guest_camping_count integer,
  p_rv_count integer,
  p_package_terms jsonb,
  p_reception_overage_rate_cents integer default null
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.bookings;
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(5827206);
  update public.calendar_blocks set state = 'expired'
    where kind = 'hold' and state = 'active' and expires_at <= now();

  perform 1 from public.inquiries where id = p_inquiry_id for update;
  if not found then
    raise exception 'Inquiry not found';
  end if;
  if exists (select 1 from public.bookings where inquiry_id = p_inquiry_id and status = 'confirmed') then
    raise exception 'This inquiry already has a confirmed booking';
  end if;

  update public.calendar_blocks set state = 'released'
    where kind = 'hold' and state = 'active' and inquiry_id = p_inquiry_id;

  insert into public.bookings (
    inquiry_id, package, package_terms, start_date, end_date,
    guest_reception_count, guest_camping_count, rv_count, reception_overage_rate_cents
  ) values (
    p_inquiry_id, p_package, p_package_terms, p_start_date, p_end_date,
    p_guest_reception_count, p_guest_camping_count, p_rv_count, p_reception_overage_rate_cents
  ) returning * into result;

  update public.inquiries set status = 'booking_confirmed' where id = p_inquiry_id;
  return result;
end;
$$;

create or replace function public.create_calendar_hold(
  p_start_date date,
  p_end_date date,
  p_expires_at timestamptz,
  p_label text,
  p_inquiry_id uuid default null
)
returns public.calendar_blocks
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.calendar_blocks;
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_expires_at <= now() or p_expires_at is null then
    raise exception 'Hold expiry must be in the future';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(5827206);
  update public.calendar_blocks set state = 'expired'
    where kind = 'hold' and state = 'active' and expires_at <= now();

  insert into public.calendar_blocks (kind, start_date, end_date, expires_at, label, inquiry_id)
  values ('hold', p_start_date, p_end_date, p_expires_at, p_label, p_inquiry_id)
  returning * into result;
  return result;
end;
$$;

create or replace function public.create_calendar_blackout(
  p_start_date date,
  p_end_date date,
  p_label text
)
returns public.calendar_blocks
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.calendar_blocks;
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(5827206);
  update public.calendar_blocks set state = 'expired'
    where kind = 'hold' and state = 'active' and expires_at <= now();

  insert into public.calendar_blocks (kind, start_date, end_date, label)
  values ('blackout', p_start_date, p_end_date, p_label)
  returning * into result;
  return result;
end;
$$;

create or replace function public.release_calendar_block(p_block_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  update public.calendar_blocks set state = 'released'
    where id = p_block_id and kind in ('hold', 'blackout') and state = 'active';
  if not found then
    raise exception 'Active hold or blackout not found';
  end if;
end;
$$;

create or replace function public.cancel_calendar_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  update public.bookings set status = 'cancelled' where id = p_booking_id and status = 'confirmed';
  if not found then
    raise exception 'Confirmed booking not found';
  end if;
end;
$$;

-- All writes go through checked functions. The exclusion constraint also guards
-- service-role or SQL writes that bypass the application.
revoke insert, update, delete on public.bookings from anon, authenticated;
grant select on public.bookings to authenticated;

revoke all on function public.confirm_booking_from_inquiry(
  uuid, public.package_type, date, date, integer, integer, integer, jsonb, integer
) from public, anon;
grant execute on function public.confirm_booking_from_inquiry(
  uuid, public.package_type, date, date, integer, integer, integer, jsonb, integer
) to authenticated;
revoke all on function public.create_calendar_hold(date, date, timestamptz, text, uuid) from public, anon;
grant execute on function public.create_calendar_hold(date, date, timestamptz, text, uuid) to authenticated;
revoke all on function public.create_calendar_blackout(date, date, text) from public, anon;
grant execute on function public.create_calendar_blackout(date, date, text) to authenticated;
revoke all on function public.release_calendar_block(uuid) from public, anon;
grant execute on function public.release_calendar_block(uuid) to authenticated;
revoke all on function public.cancel_calendar_booking(uuid) from public, anon;
grant execute on function public.cancel_calendar_booking(uuid) to authenticated;
