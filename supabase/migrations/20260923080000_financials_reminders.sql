-- Contract total is entered from the signed agreement. Package snapshots stay
-- immutable and optional charges are counted only after explicit approval.
create table public.booking_financial_agreement (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  contract_total_cents bigint not null check (contract_total_cents >= 0),
  agreed_at timestamptz,
  notes text,
  updated_at timestamptz not null default now()
);
create or replace function public.touch_booking_financial_agreement() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := clock_timestamp(); return new; end $$;
create trigger booking_financial_agreement_touch before update on public.booking_financial_agreement
for each row execute function public.touch_booking_financial_agreement();
create table public.booking_optional_charges (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  label text not null check (length(trim(label)) between 1 and 120),
  amount_cents bigint not null check (amount_cents > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'waived')),
  included_in_contract boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);
create index booking_optional_charges_booking on public.booking_optional_charges (booking_id);
create table public.booking_receipts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  payment_item_id uuid references public.booking_payment_items(id) on delete set null,
  amount_cents integer not null check (amount_cents > 0),
  method text not null check (method in ('e_transfer', 'cash', 'card', 'cheque', 'other')),
  received_at timestamptz not null,
  reference text,
  notes text,
  recorded_at timestamptz not null default now(),
  actor_user_id uuid default auth.uid()
);
create index booking_receipts_booking on public.booking_receipts (booking_id, received_at);
create index booking_receipts_item on public.booking_receipts (payment_item_id);

create or replace function public.validate_booking_receipt() returns trigger
language plpgsql set search_path = '' as $$
declare item_booking uuid;
begin
  if new.payment_item_id is not null then
    select booking_id into item_booking from public.booking_payment_items where id = new.payment_item_id;
    if item_booking is distinct from new.booking_id then
      raise exception 'Receipt and scheduled item belong to different bookings';
    end if;
  end if;
  return new;
end $$;
create trigger booking_receipt_validate before insert or update on public.booking_receipts
for each row execute function public.validate_booking_receipt();

create or replace function public.refresh_booking_payment_item(p_item_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_item_id is null then return; end if;
  update public.booking_payment_items p set
    paid_cents = coalesce((select sum(r.amount_cents) from public.booking_receipts r where r.payment_item_id = p_item_id), 0),
    paid_at = (select max(r.received_at) from public.booking_receipts r where r.payment_item_id = p_item_id)
  where p.id = p_item_id;
end $$;
revoke all on function public.refresh_booking_payment_item(uuid) from public, anon, authenticated;
create or replace function public.sync_booking_receipts() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op <> 'INSERT' then perform public.refresh_booking_payment_item(old.payment_item_id); end if;
  if tg_op <> 'DELETE' then perform public.refresh_booking_payment_item(new.payment_item_id); end if;
  return coalesce(new, old);
end $$;
create trigger booking_receipts_sync after insert or update or delete on public.booking_receipts
for each row execute function public.sync_booking_receipts();

-- Preserve money previously entered in the cumulative paid field as one
-- historical receipt; do not fabricate a bank reference or e-transfer method.
insert into public.booking_receipts (booking_id, payment_item_id, amount_cents, method, received_at, notes)
select booking_id, id, paid_cents, 'other', coalesce(paid_at, created_at),
  'Imported from previous cumulative paid amount; verify against bank records'
from public.booking_payment_items where paid_cents > 0;
revoke update on public.booking_payment_items from authenticated;

-- Admins can amend the schedule without writing the receipt-derived paid fields.
create or replace function public.update_booking_payment_item(
  p_item_id uuid, p_label text, p_amount_due_cents integer, p_due_on date)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  update public.booking_payment_items set
    label = p_label, amount_due_cents = p_amount_due_cents, due_on = p_due_on
  where id = p_item_id;
  if not found then raise exception 'Payment item not found'; end if;
end $$;
revoke all on function public.update_booking_payment_item(uuid, text, integer, date) from public, anon;
grant execute on function public.update_booking_payment_item(uuid, text, integer, date) to authenticated;

create or replace function public.delete_unpaid_booking_payment_item(p_item_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare item_paid integer;
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  select paid_cents into item_paid from public.booking_payment_items where id = p_item_id for update;
  if item_paid is null then raise exception 'Payment item not found'; end if;
  if item_paid > 0 or exists (select 1 from public.booking_receipts where payment_item_id = p_item_id) then
    raise exception 'Remove or reallocate linked receipts before deleting this installment';
  end if;
  delete from public.booking_payment_items where id = p_item_id;
end $$;
revoke all on function public.delete_unpaid_booking_payment_item(uuid) from public, anon;
grant execute on function public.delete_unpaid_booking_payment_item(uuid) to authenticated;

alter table public.booking_tasks add column remind_couple boolean not null default false;
create table public.booking_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  target_kind text not null check (target_kind in ('payment', 'task')),
  target_id uuid not null,
  channel text not null check (channel in ('email', 'text', 'phone')),
  recipient_address text not null,
  sent_at timestamptz not null default now(),
  notes text,
  actor_user_id uuid default auth.uid()
);
create index booking_reminder_deliveries_target on public.booking_reminder_deliveries (target_kind, target_id, sent_at desc);

alter table public.booking_financial_agreement enable row level security;
alter table public.booking_optional_charges enable row level security;
alter table public.booking_receipts enable row level security;
alter table public.booking_reminder_deliveries enable row level security;
create policy booking_financial_agreement_admin on public.booking_financial_agreement for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy booking_optional_charges_admin on public.booking_optional_charges for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy booking_receipts_admin on public.booking_receipts for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy booking_reminder_deliveries_admin_read on public.booking_reminder_deliveries for select to authenticated using (public.is_admin());
grant select, insert, update, delete on public.booking_financial_agreement, public.booking_optional_charges, public.booking_receipts to authenticated;
grant select on public.booking_reminder_deliveries to authenticated;

create or replace function public.record_reminder_delivery(
  p_target_kind text, p_target_id uuid, p_channel text, p_notes text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target_booking uuid;
declare preferred text;
declare recipient text;
declare result uuid;
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(5827210, hashtext(p_target_id::text));
  if p_target_kind = 'payment' then
    select booking_id into target_booking from public.booking_payment_items
      where id = p_target_id and paid_cents < amount_due_cents and due_on <= current_date + 7;
  elsif p_target_kind = 'task' then
    select booking_id into target_booking from public.booking_tasks
      where id = p_target_id and area = 'planning' and remind_couple
        and completed_at is null and due_at <= now() + interval '7 days';
  else
    raise exception 'Unsupported reminder target';
  end if;
  if target_booking is null then raise exception 'Reminder is complete or not due'; end if;
  if p_target_kind = 'payment' and exists (
    select 1 from public.booking_financial_agreement a where a.booking_id = target_booking
      and a.contract_total_cents + coalesce((select sum(c.amount_cents) from public.booking_optional_charges c
        where c.booking_id = target_booking and c.status = 'approved' and not c.included_in_contract), 0)
      <= coalesce((select sum(r.amount_cents) from public.booking_receipts r where r.booking_id = target_booking), 0)
  ) then
    raise exception 'Wedding balance is already paid; reconcile installment allocations';
  end if;
  if exists (select 1 from public.booking_reminder_deliveries
    where target_kind = p_target_kind and target_id = p_target_id
      and sent_at > now() - interval '7 days') then
    raise exception 'Reminder already recorded in the last seven days';
  end if;
  select case lower(trim(i.preferred_contact))
      when 'email' then 'email' when 'text' then 'text' when 'sms' then 'text'
      when 'text message' then 'text' when 'phone' then 'phone' when 'phone call' then 'phone'
      else null end,
    case when p_channel = 'email' then coalesce(nullif(trim(i.preferred_contact_email), ''), i.email) else i.phone end
    into preferred, recipient
    from public.bookings b join public.inquiries i on i.id = b.inquiry_id
    where b.id = target_booking and b.status = 'confirmed';
  if preferred is null or p_channel is null or p_channel <> preferred or nullif(trim(recipient), '') is null then
    raise exception 'Use the couple''s recorded contact preference and address';
  end if;
  insert into public.booking_reminder_deliveries
    (booking_id, target_kind, target_id, channel, recipient_address, notes)
    values (target_booking, p_target_kind, p_target_id, p_channel, recipient, nullif(left(trim(p_notes), 2000), ''))
    returning id into result;
  return result;
end $$;
revoke all on function public.record_reminder_delivery(text, uuid, text, text) from public, anon;
grant execute on function public.record_reminder_delivery(text, uuid, text, text) to authenticated;

create or replace function public.log_booking_financial_change() returns trigger language plpgsql as $$
begin
  insert into public.booking_activity (booking_id, kind, details)
    values (coalesce(new.booking_id, old.booking_id), 'change', tg_argv[0] || ' ' || lower(tg_op));
  return coalesce(new, old);
end $$;
create trigger financial_agreement_log after insert or update on public.booking_financial_agreement
for each row execute function public.log_booking_financial_change('Financial agreement');
create trigger optional_charge_log after insert or update or delete on public.booking_optional_charges
for each row execute function public.log_booking_financial_change('Optional charge');
create trigger receipt_log after insert or update or delete on public.booking_receipts
for each row execute function public.log_booking_financial_change('Payment receipt');
