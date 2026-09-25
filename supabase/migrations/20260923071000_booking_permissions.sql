-- Authentication creates an inert client profile. Only a trusted admin can
-- change its role or attach it to a wedding. No browser can write users.role.
drop policy if exists users_self_upsert on public.users;
drop policy if exists users_self_insert_client on public.users;
drop policy if exists users_self_read on public.users;
drop policy if exists users_admin_all on public.users;
create policy users_self_read on public.users for select to authenticated using (id = auth.uid());
create policy users_admin_read on public.users for select to authenticated using (public.is_admin());
revoke all on public.users from anon, authenticated;
grant select on public.users to authenticated;

create or replace function public.create_user_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users (id, role) values (new.id, 'client') on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created_crm on auth.users;
create trigger on_auth_user_created_crm after insert on auth.users
for each row execute function public.create_user_profile();
insert into public.users (id, role)
select id, 'client' from auth.users on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'booking_access_role' and typnamespace = 'public'::regnamespace) then
    create type public.booking_access_role as enum ('couple', 'staff', 'family');
  end if;
end $$;
create table public.booking_members (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  access public.booking_access_role not null,
  added_at timestamptz not null default now(),
  primary key (booking_id, user_id)
);
create index booking_members_user on public.booking_members (user_id, booking_id);
alter table public.booking_members enable row level security;
create policy booking_members_admin_read on public.booking_members for select to authenticated using (public.is_admin());
create policy booking_members_self_read on public.booking_members for select to authenticated using (user_id = auth.uid());
revoke all on public.booking_members from anon, authenticated;
grant select on public.booking_members to authenticated;

-- Preserve a legitimate legacy primary client link as the first couple member.
insert into public.booking_members (booking_id, user_id, access)
select b.id, b.client_user_id, 'couple'
from public.bookings b join public.users u on u.id = b.client_user_id
where b.client_user_id is not null and u.role = 'client'
on conflict (booking_id, user_id) do nothing;

create or replace function public.has_booking_access(p_booking_id uuid, p_access public.booking_access_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.booking_members m
    join public.users u on u.id = m.user_id
    where m.booking_id = p_booking_id and m.user_id = (select auth.uid())
      and m.access = any(p_access)
      and ((m.access = 'couple' and u.role = 'client')
        or (m.access = 'staff' and u.role = 'staff')
        or (m.access = 'family' and u.role = 'family'))
  );
$$;
revoke all on function public.has_booking_access(uuid, public.booking_access_role[]) from public, anon;
grant execute on function public.has_booking_access(uuid, public.booking_access_role[]) to authenticated;

-- The full booking row contains financial terms. Only assigned couple accounts
-- may select their own booking; staff/family use the limited portal RPC below.
create policy bookings_couple_read on public.bookings for select to authenticated
  using (public.has_booking_access(id, array['couple']::public.booking_access_role[]));

create or replace function public.my_crm_role() returns text
language sql stable security definer set search_path = '' as $$
  select role::text from public.users where id = (select auth.uid());
$$;
revoke all on function public.my_crm_role() from public, anon;
grant execute on function public.my_crm_role() to authenticated;

create or replace function public.assign_booking_member(
  p_booking_id uuid, p_email text, p_access public.booking_access_role)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target_id uuid;
declare target_role public.user_role;
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if not exists (select 1 from public.bookings where id = p_booking_id and status = 'confirmed') then
    raise exception 'Confirmed booking not found';
  end if;
  select id into target_id from auth.users
    where lower(email) = lower(trim(p_email)) and email_confirmed_at is not null limit 1;
  if target_id is null then raise exception 'Verified account not found. Ask the person to register and verify email first'; end if;
  target_role := case p_access
    when 'couple' then 'client'::public.user_role
    when 'staff' then 'staff'::public.user_role
    else 'family'::public.user_role end;
  insert into public.users (id, role) values (target_id, 'client') on conflict (id) do nothing;
  if exists (select 1 from public.users where id = target_id and role = 'admin') then
    raise exception 'Admin accounts do not need a portal assignment';
  end if;
  if exists (select 1 from public.booking_members
    where user_id = target_id and booking_id <> p_booking_id and access <> p_access) then
    raise exception 'This account has a different role on another wedding';
  end if;
  update public.users set role = target_role where id = target_id;
  insert into public.booking_members (booking_id, user_id, access)
    values (p_booking_id, target_id, p_access)
    on conflict (booking_id, user_id) do update set access = excluded.access;
  return target_id;
end $$;
revoke all on function public.assign_booking_member(uuid, text, public.booking_access_role) from public, anon;
grant execute on function public.assign_booking_member(uuid, text, public.booking_access_role) to authenticated;

create or replace function public.remove_booking_member(p_booking_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  delete from public.booking_members where booking_id = p_booking_id and user_id = p_user_id;
end $$;
revoke all on function public.remove_booking_member(uuid, uuid) from public, anon;
grant execute on function public.remove_booking_member(uuid, uuid) to authenticated;

create or replace function public.get_booking_members(p_booking_id uuid)
returns table (user_id uuid, email text, access public.booking_access_role)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  return query select m.user_id, a.email::text, m.access
    from public.booking_members m join auth.users a on a.id = m.user_id
    where m.booking_id = p_booking_id order by m.access, a.email;
end $$;
revoke all on function public.get_booking_members(uuid) from public, anon;
grant execute on function public.get_booking_members(uuid) to authenticated;

create or replace function public.get_my_weddings()
returns table (
  booking_id uuid, access public.booking_access_role, start_date date, end_date date,
  package_name text, full_name text, partner_name text,
  guest_reception_count integer, guest_camping_count integer, rv_count integer)
language sql stable security definer set search_path = '' as $$
  select b.id, m.access, b.start_date, b.end_date,
    coalesce(b.package_terms->>'name', b.package::text),
    coalesce(i.full_name, 'Wedding'), i.partner_name,
    b.guest_reception_count, b.guest_camping_count, b.rv_count
  from public.booking_members m
  join public.users u on u.id = m.user_id
  join public.bookings b on b.id = m.booking_id
  left join public.inquiries i on i.id = b.inquiry_id
  where m.user_id = (select auth.uid()) and b.status = 'confirmed'
    and ((m.access = 'couple' and u.role = 'client')
      or (m.access = 'staff' and u.role = 'staff')
      or (m.access = 'family' and u.role = 'family'))
  order by b.start_date;
$$;
revoke all on function public.get_my_weddings() from public, anon;
grant execute on function public.get_my_weddings() to authenticated;

-- One explicit, non-financial portal payload. It never includes package price,
-- payment items, deposit, contract reference, activity, or inspection photos.
create or replace function public.get_my_wedding_operations(p_booking_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare member_access public.booking_access_role;
begin
  select m.access into member_access from public.booking_members m join public.users u on u.id = m.user_id
    join public.bookings b on b.id = m.booking_id and b.status = 'confirmed'
    where m.booking_id = p_booking_id and m.user_id = auth.uid()
      and ((m.access = 'couple' and u.role = 'client')
        or (m.access = 'staff' and u.role = 'staff')
        or (m.access = 'family' and u.role = 'family'));
  if member_access is null then raise exception 'Wedding access denied' using errcode = '42501'; end if;
  return jsonb_build_object(
    'camp', coalesce((select jsonb_agg(jsonb_build_object('group', group_name, 'kind', kind,
      'occupants', occupants, 'arrival', arrival_on, 'departure', departure_on,
      'site', site_label, 'contact', contact_name, 'phone', contact_phone) order by arrival_on)
      from public.booking_camp_units where booking_id = p_booking_id), '[]'::jsonb),
    'cabin', (select jsonb_build_object('guests', guest_names, 'occupants', occupants,
      'arrival', arrival_on, 'departure', departure_on) from public.booking_cabin_stay where booking_id = p_booking_id),
    'vendors', coalesce((select jsonb_agg(jsonb_build_object('name', vendor_name, 'service', service,
      'arrival', arrival_at, 'departure', departure_at, 'contact', contact_name,
      'phone', contact_phone, 'power', power_needs) order by arrival_at)
      from public.booking_vendor_arrivals where booking_id = p_booking_id), '[]'::jsonb),
    'contacts', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'role', role, 'phone', phone))
      from public.booking_emergency_contacts where booking_id = p_booking_id), '[]'::jsonb),
    'weather', (select jsonb_build_object('forecast', weather_forecast, 'plan', weather_plan,
      'decision', weather_decision, 'decided_at', weather_decided_at)
      from public.booking_ops_profile where booking_id = p_booking_id),
    'checks', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'label', label, 'area', area,
      'owner', owner, 'notes', notes, 'completed_at', completed_at) order by area, label)
      from public.booking_ops_checks where booking_id = p_booking_id), '[]'::jsonb),
    'tasks', coalesce((select jsonb_agg(jsonb_build_object('title', title, 'area', area,
      'assigned_to', assigned_to, 'due_at', due_at, 'completed_at', completed_at) order by due_at)
      from public.booking_tasks where booking_id = p_booking_id
        and ((member_access = 'couple' and area = 'planning')
          or (member_access in ('staff', 'family') and area = 'operations'))), '[]'::jsonb)
  );
end $$;
revoke all on function public.get_my_wedding_operations(uuid) from public, anon;
grant execute on function public.get_my_wedding_operations(uuid) to authenticated;

-- Staff/family may complete readiness checks, but cannot edit financial fields
-- or arbitrary columns on booking_ops_checks. Admin UI uses the same RPC.
revoke update on public.booking_ops_checks from authenticated;
create or replace function public.save_wedding_ops_check(
  p_check_id uuid, p_owner text, p_notes text, p_complete boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare target_booking uuid;
begin
  select booking_id into target_booking from public.booking_ops_checks where id = p_check_id;
  if target_booking is null then raise exception 'Check not found'; end if;
  if not public.is_admin() and not public.has_booking_access(target_booking,
    array['staff', 'family']::public.booking_access_role[]) then
    raise exception 'Operations access required' using errcode = '42501';
  end if;
  update public.booking_ops_checks set owner = nullif(left(trim(p_owner), 120), ''),
    notes = nullif(left(trim(p_notes), 1000), ''),
    completed_at = case when p_complete then coalesce(completed_at, now()) else null end
    where id = p_check_id;
end $$;
revoke all on function public.save_wedding_ops_check(uuid, text, text, boolean) from public, anon;
grant execute on function public.save_wedding_ops_check(uuid, text, text, boolean) to authenticated;
