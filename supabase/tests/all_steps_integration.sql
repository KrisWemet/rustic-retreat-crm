-- Use the same service-role intake and authenticated RPC boundaries as the app.
set role service_role;
do $$ declare a uuid; b uuid; payload jsonb := jsonb_build_object(
  'submissionId','full-workflow','partner1FirstName','Full workflow couple',
  'partner2FirstName','Partner','email','workflow@example.com','phone','7805550101',
  'preferredContact','phone','weddingDate','Summer 2027','guestCount','90');
begin
  a := public.import_website_inquiry(payload, repeat('b',64));
  b := public.import_website_inquiry(payload, repeat('b',64));
  if a is distinct from b then raise exception 'Intake retry returned a different lead'; end if;
end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);

do $$ declare lead uuid; held public.calendar_blocks; wedding public.bookings;
  approved jsonb; payment uuid; task uuid; other_lead uuid; option_start date;
begin
  select id into lead from public.inquiries where external_submission_id='full-workflow';
  if (select wedding_date_estimate from public.inquiries where id=lead) <> 'Summer 2027' then
    raise exception 'Intake lost the flexible date';
  end if;
  select terms into approved from public.booking_package_catalog where season=2027 and package='five_day';
  held := public.create_calendar_hold('2027-08-04','2027-08-08',now()+interval '1 day','Couple hold',lead);
  wedding := public.confirm_booking_from_inquiry(lead,'five_day','2027-08-04','2027-08-08',90,60,15,approved,2500);
  if wedding.reception_overage_total_cents <> 25000 or wedding.package_terms->>'basePriceCents' <> '750000' or
    (select status from public.inquiries where id=lead) <> 'booking_confirmed' or
    (select state from public.calendar_blocks where id=held.id) <> 'released' or
    (select count(*) from public.booking_ops_checks where booking_id=wedding.id) <> 8 then
    raise exception 'Conversion failed to connect terms, overage, inquiry, hold, and operations';
  end if;
  begin
    perform public.confirm_booking_from_inquiry(lead,'five_day','2027-08-04','2027-08-08',90,60,15,approved,2500);
    raise exception 'Duplicate conversion accepted';
  exception when raise_exception then if sqlerrm='Duplicate conversion accepted' then raise; end if; end;
  begin
    perform public.create_calendar_blackout('2027-08-09','2027-08-09','Reset conflict');
    raise exception 'Reset day was double booked';
  exception when exclusion_violation then null; end;
  begin
    delete from public.inquiries where id=lead;
    raise exception 'Booked contact was deleted';
  exception when raise_exception then if sqlerrm='Booked contact was deleted' then raise; end if; end;
  begin
    update public.inquiries set status='new' where id=lead;
    raise exception 'Confirmed wedding returned to the sales pipeline';
  exception when raise_exception then
    if sqlerrm='Confirmed wedding returned to the sales pipeline' then raise; end if;
  end;

  insert into public.inquiries (full_name,email) values ('Conflict lead','conflict@example.com') returning id into other_lead;
  begin
    perform public.confirm_booking_from_inquiry(other_lead,'five_day','2027-08-04','2027-08-08',80,20,2,approved,null);
    raise exception 'Overlapping conversion accepted';
  exception when exclusion_violation then null; end;
  if exists(select 1 from public.bookings where inquiry_id=other_lead) or
    (select status from public.inquiries where id=other_lead) <> 'new' then
    raise exception 'Failed conversion left a partial booking or changed lead status';
  end if;
  begin
    perform public.confirm_booking_from_inquiry(other_lead,'five_day','2027-10-06','2027-10-10',80,20,2,
      jsonb_set(approved,'{basePriceCents}','1'),null);
    raise exception 'Tampered price accepted';
  exception when raise_exception then if sqlerrm='Tampered price accepted' then raise; end if; end;
  begin
    perform public.confirm_booking_from_inquiry(other_lead,'five_day','2027-10-06','2027-10-10',101,20,2,approved,2500);
    raise exception 'Reception above 100 accepted';
  exception when raise_exception then if sqlerrm='Reception above 100 accepted' then raise; end if; end;

  -- All three five-day windows must work when the surrounding dates are free.
  foreach option_start in array array['2027-09-01'::date,'2027-09-09'::date,'2027-09-17'::date] loop
    insert into public.inquiries(full_name,email) values('Window test','window@example.com') returning id into other_lead;
    perform public.confirm_booking_from_inquiry(other_lead,'five_day',option_start,option_start+4,80,20,2,approved,null);
  end loop;

  insert into public.booking_camp_units(booking_id,group_name,kind,occupants,arrival_on,departure_on)
    values(wedding.id,'Family group','tent',4,wedding.start_date,wedding.end_date);
  insert into public.booking_financial_agreement(booking_id,contract_total_cents) values(wedding.id,775000);
  insert into public.booking_damage_deposit(booking_id,agreed_cents) values(wedding.id,50000);
  insert into public.booking_payment_items(booking_id,label,amount_due_cents,due_on)
    values(wedding.id,'Installment',10000,current_date) returning id into payment;
  begin
    insert into public.booking_payment_items(booking_id,label,amount_due_cents,due_on,paid_cents,paid_at)
      values(wedding.id,'Fake paid',10000,current_date,10000,now());
    raise exception 'Paid amount accepted without a receipt';
  exception when insufficient_privilege then null; end;
  perform public.record_reminder_delivery('payment',payment,'phone','Spoke to couple');
  insert into public.booking_receipts(booking_id,payment_item_id,amount_cents,method,received_at)
    values(wedding.id,payment,10000,'e_transfer',now());
  begin
    perform public.record_reminder_delivery('payment',payment,'phone',null);
    raise exception 'Paid installment still eligible for reminders';
  exception when raise_exception then
    if sqlerrm <> 'Reminder is complete or not due' then raise; end if;
  end;
  insert into public.booking_tasks(booking_id,area,title,due_at,remind_couple)
    values(wedding.id,'planning','Guest list',now(),true) returning id into task;
  update public.booking_tasks set completed_at=now() where id=task;
  begin
    perform public.record_reminder_delivery('task',task,'phone',null);
    raise exception 'Completed planning task still eligible for reminders';
  exception when raise_exception then
    if sqlerrm <> 'Reminder is complete or not due' then raise; end if;
  end;
  perform public.assign_booking_member(wedding.id,'partner1@example.com','couple');
  perform public.assign_booking_member(wedding.id,'staff@example.com','staff');
end $$;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
do $$ declare wedding uuid; payload jsonb; begin
  select booking_id into wedding from public.get_my_weddings() where full_name='Full workflow couple';
  payload := public.get_my_wedding_operations(wedding);
  if jsonb_array_length(payload->'camp') <> 1 or (select count(*) from public.booking_financial_agreement) <> 0 then
    raise exception 'Operational handoff exposed finance or lost camping data';
  end if;
  perform public.save_wedding_ops_check((payload->'checks'->0->>'id')::uuid,'Staff','Ready',true);
end $$;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
do $$ begin
  if exists(select 1 from public.get_my_weddings() where full_name='Full workflow couple') or
    exists(select 1 from public.bookings where start_date='2027-08-04') then
    raise exception 'Another couple gained access to the converted wedding';
  end if;
end $$;
select 'Steps 1–7 intake, conversion, calendar, operations, permissions, and finance passed';
