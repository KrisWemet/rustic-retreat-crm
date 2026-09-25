-- Exercise the handoff from a confirmed wedding workspace through property
-- operations, the portal, financial records, and reminder state.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);

insert into public.booking_workspace (booking_id, contract_signed_at, contract_reference,
  setup_owner, readiness_owner, checkout_owner)
values ('10000000-0000-0000-0000-000000000001', now(), 'SIGNED-001',
  'Venue team', 'Venue team', 'Venue team');
insert into public.booking_camp_units (booking_id, group_name, kind, occupants,
  arrival_on, departure_on, contact_name)
values ('10000000-0000-0000-0000-000000000001', 'Partner family', 'rv', 4,
  '2027-06-11', '2027-06-13', 'Family contact');
update public.booking_damage_deposit set received_cents = 50000, received_at = now(),
  refunded_cents = 20000, refunded_at = now(), retained_cents = 30000
where booking_id = '10000000-0000-0000-0000-000000000001';

do $$ begin
  if (select count(*) from public.booking_ops_checks where booking_id = '10000000-0000-0000-0000-000000000001') <> 8 then
    raise exception 'Booking conversion did not seed eight property checks';
  end if;
  if (select count(*) from public.booking_activity where booking_id = '10000000-0000-0000-0000-000000000001') < 5 then
    raise exception 'Workspace, operations, or finance changes missing from activity';
  end if;
  if (select received_cents from public.booking_damage_deposit where booking_id = '10000000-0000-0000-0000-000000000001') <> 50000 or
    (select contract_total_cents from public.booking_financial_agreement where booking_id = '10000000-0000-0000-0000-000000000001') <> 20000 then
    raise exception 'Damage deposit and contract total were not kept separately';
  end if;
end $$;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
do $$ declare payload jsonb; check_id uuid; begin
  payload := public.get_my_wedding_operations('10000000-0000-0000-0000-000000000001');
  if jsonb_array_length(payload->'camp') <> 1 or payload ? 'deposit' or payload ? 'payments' then
    raise exception 'Staff portal did not receive the operations-only camping record';
  end if;
  check_id := (payload->'checks'->0->>'id')::uuid;
  perform public.save_wedding_ops_check(check_id, 'Staff', 'Prepared', true);
end $$;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
do $$ declare payload jsonb; begin
  payload := public.get_my_wedding_operations('10000000-0000-0000-0000-000000000001');
  if jsonb_array_length(payload->'camp') <> 1 or
    (select count(*) from public.booking_payment_items) <> 0 or
    (select count(*) from public.booking_receipts) <> 0 or
    (select count(*) from public.booking_damage_deposit) <> 0 then
    raise exception 'Couple portal access or financial separation failed';
  end if;
end $$;
select 'Steps 5–7 booking, operations, portal, finance integration passed';
