-- Expire holds before returning availability, even when no new reservation is made.
create or replace function public.get_active_calendar_blocks()
returns setof public.calendar_blocks
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(5827206);
  update public.calendar_blocks set state = 'expired'
    where kind = 'hold' and state = 'active' and expires_at <= now();
  return query
    select * from public.calendar_blocks
    where state = 'active'
    order by start_date;
end;
$$;

revoke all on function public.get_active_calendar_blocks() from public, anon;
grant execute on function public.get_active_calendar_blocks() to authenticated;
