insert into auth.users (id,email,email_confirmed_at) values
('00000000-0000-0000-0000-000000000001','admin@example.com',now()),
('00000000-0000-0000-0000-000000000002','partner1@example.com',now()),
('00000000-0000-0000-0000-000000000003','partner2@example.com',now()),
('00000000-0000-0000-0000-000000000004','staff@example.com',now()),
('00000000-0000-0000-0000-000000000005','family@example.com',now()),
('00000000-0000-0000-0000-000000000006','outsider@example.com',now()),
('00000000-0000-0000-0000-000000000007','unverified@example.com',null);
update public.users set role='admin' where id='00000000-0000-0000-0000-000000000001';
insert into public.inquiries (id, full_name, email) values
('20000000-0000-0000-0000-000000000001','First Wedding','first@example.com'),
('20000000-0000-0000-0000-000000000002','Other Wedding','other@example.com');
insert into public.bookings (id, inquiry_id, package, package_terms, start_date, end_date,
 guest_reception_count, guest_camping_count, rv_count)
select '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
 'three_day', terms, '2027-06-11', '2027-06-13', 80, 30, 4
from public.booking_package_catalog where season=2027 and package='three_day';
insert into public.bookings (id, inquiry_id, package, package_terms, start_date, end_date,
 guest_reception_count, guest_camping_count, rv_count)
select '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
 'three_day', terms, '2027-06-18', '2027-06-20', 80, 20, 2
from public.booking_package_catalog where season=2027 and package='three_day';
insert into public.booking_payment_items (booking_id,label,amount_due_cents,due_on)
values ('10000000-0000-0000-0000-000000000001','Private payment',10000,'2027-06-01');
insert into public.booking_damage_deposit (booking_id,agreed_cents)
values ('10000000-0000-0000-0000-000000000001',50000);

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select public.assign_booking_member('10000000-0000-0000-0000-000000000001','partner1@example.com','couple');
select public.assign_booking_member('10000000-0000-0000-0000-000000000001','partner2@example.com','couple');
select public.assign_booking_member('10000000-0000-0000-0000-000000000001','staff@example.com','staff');
select public.assign_booking_member('10000000-0000-0000-0000-000000000001','family@example.com','family');
do $$ begin
  begin
    perform public.assign_booking_member('10000000-0000-0000-0000-000000000001','unverified@example.com','couple');
    raise exception 'Unverified account was linked';
  exception when raise_exception then
    if sqlerrm = 'Unverified account was linked' then raise; end if;
  end;
  if (select count(*) from public.get_booking_members('10000000-0000-0000-0000-000000000001')) <> 4 then
    raise exception 'Both partners and operations members were not linked';
  end if;
end $$;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
do $$ declare check_id uuid; begin
  if (select count(*) from public.get_my_weddings()) <> 1 or
    (select count(*) from public.bookings) <> 1 or
    (select count(*) from public.booking_payment_items) <> 0 then
    raise exception 'Couple scope or payment privacy failed';
  end if;
  begin
    update public.users set role='admin' where id=auth.uid();
    raise exception 'Self role escalation succeeded';
  exception when insufficient_privilege then null;
  end;
  check_id := (public.get_my_wedding_operations('10000000-0000-0000-0000-000000000001')->'checks'->0->>'id')::uuid;
  begin
    perform public.save_wedding_ops_check(check_id,null,null,true);
    raise exception 'Couple could modify operations check';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
do $$ begin
  if (select count(*) from public.get_my_weddings()) <> 1 then
    raise exception 'Second partner lacks own access';
  end if;
end $$;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
do $$ declare payload jsonb; check_id uuid; begin
  if (select count(*) from public.bookings) <> 0 or
    (select count(*) from public.booking_payment_items) <> 0 or
    (select count(*) from public.booking_damage_deposit) <> 0 then
    raise exception 'Staff can see financial or full booking rows';
  end if;
  payload := public.get_my_wedding_operations('10000000-0000-0000-0000-000000000001');
  if payload ? 'deposit' or payload ? 'payments' or (select count(*) from public.get_my_weddings()) <> 1 then
    raise exception 'Staff portal scope failed';
  end if;
  check_id := (payload->'checks'->0->>'id')::uuid;
  perform public.save_wedding_ops_check(check_id,'Staff','Ready',true);
  begin
    perform public.get_my_wedding_operations('10000000-0000-0000-0000-000000000002');
    raise exception 'Cross-booking operations access succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000006',false);
do $$ begin
  if (select count(*) from public.get_my_weddings()) <> 0 or
    (select count(*) from public.bookings) <> 0 then
    raise exception 'Unassigned account can see a wedding';
  end if;
end $$;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',false);
do $$ declare payload jsonb; begin
  if (select count(*) from public.get_my_weddings()) <> 1 or
    (select count(*) from public.bookings) <> 0 or
    (select count(*) from public.booking_payment_items) <> 0 or
    (select count(*) from public.booking_damage_deposit) <> 0 then
    raise exception 'Family wedding scope or financial isolation failed';
  end if;
  payload := public.get_my_wedding_operations('10000000-0000-0000-0000-000000000001');
  if payload ? 'deposit' or payload ? 'payments' then
    raise exception 'Financial data leaked into family portal';
  end if;
  begin
    perform public.get_my_wedding_operations('10000000-0000-0000-0000-000000000002');
    raise exception 'Family cross-wedding access succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
select 'Step 6 role, two-partner, financial, and cross-wedding checks passed';
