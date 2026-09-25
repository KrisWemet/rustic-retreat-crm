-- Keep the original contact record available to the calendar, portal, and reminders.
create or replace function public.protect_booked_inquiry() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.bookings where inquiry_id = old.id) then
    raise exception 'This inquiry belongs to a wedding. Keep its contact record; use the booking workflow instead of deleting it';
  end if;
  return old;
end $$;
create trigger protect_booked_inquiry before delete on public.inquiries
for each row execute function public.protect_booked_inquiry();

create or replace function public.protect_confirmed_inquiry_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status
    and exists (select 1 from public.bookings where inquiry_id = old.id and status = 'confirmed')
    and coalesce(new.status::text, '') not in ('booked','booking_confirmed','pre_event_checklist','event_week','post_event_inspection') then
    raise exception 'A confirmed wedding cannot return to the sales pipeline. Manage it from Bookings';
  end if;
  return new;
end $$;
create trigger protect_confirmed_inquiry_status before update of status on public.inquiries
for each row execute function public.protect_confirmed_inquiry_status();

-- Paid amounts must always come from receipts, including on initial insertion.
revoke insert, delete on public.booking_payment_items from authenticated;
grant insert (booking_id, label, amount_due_cents, due_on) on public.booking_payment_items to authenticated;

-- Serialize receipt changes before calculating installment totals. Without the
-- parent lock, two transactions can each calculate a total missing the other.
create or replace function public.validate_booking_receipt() returns trigger
language plpgsql security definer set search_path = '' as $$
declare item_booking uuid;
begin
  perform 1 from public.booking_payment_items
    where id = any(array[
      case when tg_op <> 'DELETE' then new.payment_item_id end,
      case when tg_op <> 'INSERT' then old.payment_item_id end
    ]) order by id for update;
  if tg_op = 'DELETE' then return old; end if;
  if new.payment_item_id is not null then
    select booking_id into item_booking from public.booking_payment_items where id = new.payment_item_id;
    if item_booking is distinct from new.booking_id then
      raise exception 'Receipt and scheduled item belong to different bookings';
    end if;
  end if;
  return new;
end $$;
drop trigger booking_receipt_validate on public.booking_receipts;
create trigger booking_receipt_validate before insert or update or delete on public.booking_receipts
for each row execute function public.validate_booking_receipt();
