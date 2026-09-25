update public.inquiries set preferred_contact='email', preferred_contact_email='reminder@example.com'
where id='20000000-0000-0000-0000-000000000001';
update public.booking_payment_items set due_on=current_date
where booking_id='10000000-0000-0000-0000-000000000001';
insert into public.booking_tasks (id,booking_id,area,title,due_at,remind_couple)
values ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',
  'planning','Complete questionnaire',now(),true);

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
insert into public.booking_financial_agreement (booking_id,contract_total_cents,agreed_at)
values ('10000000-0000-0000-0000-000000000001',20000,now());
insert into public.booking_optional_charges (booking_id,label,amount_cents,status,included_in_contract)
values ('10000000-0000-0000-0000-000000000001','Extra service',3000,'pending',false),
  ('10000000-0000-0000-0000-000000000001','Already agreed',2000,'approved',true);
update public.booking_optional_charges set status='approved' where label='Extra service';
insert into public.booking_receipts (booking_id,payment_item_id,amount_cents,method,received_at,reference)
select p.booking_id,p.id,5000,'e_transfer',now(),'TRANSFER-123'
from public.booking_payment_items p where p.booking_id='10000000-0000-0000-0000-000000000001';
do $$ declare p uuid; begin
  select id into p from public.booking_payment_items where booking_id='10000000-0000-0000-0000-000000000001';
  if (select paid_cents from public.booking_payment_items where id=p) <> 5000 then
    raise exception 'Receipt did not update installment paid amount';
  end if;
  begin
    insert into public.booking_receipts (booking_id,payment_item_id,amount_cents,method,received_at)
    values ('10000000-0000-0000-0000-000000000001',p,6000,'cash',now());
    raise exception 'Overpaid installment accepted';
  exception when check_violation then null;
  end;
  begin
    perform public.record_reminder_delivery('payment',p,'text',null);
    raise exception 'Wrong contact channel accepted';
  exception when raise_exception then
    if sqlerrm='Wrong contact channel accepted' then raise; end if;
  end;
  perform public.record_reminder_delivery('payment',p,'email','Email sent manually');
  if not exists(select 1 from public.booking_reminder_deliveries where target_id=p and recipient_address='reminder@example.com') then
    raise exception 'Reminder ignored the preferred email address';
  end if;
  begin
    perform public.record_reminder_delivery('payment',p,'email',null);
    raise exception 'Duplicate reminder accepted';
  exception when raise_exception then
    if sqlerrm='Duplicate reminder accepted' then raise; end if;
  end;
  perform public.record_reminder_delivery('task','30000000-0000-0000-0000-000000000001','email','Task reminder sent');
  update public.booking_tasks set completed_at=now() where id='30000000-0000-0000-0000-000000000001';
  begin
    perform public.record_reminder_delivery('task','30000000-0000-0000-0000-000000000001','email',null);
    raise exception 'Completed task reminder accepted';
  exception when raise_exception then
    if sqlerrm='Completed task reminder accepted' then raise; end if;
  end;
end $$;
do $$ declare p uuid; disposable uuid; begin
  select id into p from public.booking_payment_items
    where booking_id='10000000-0000-0000-0000-000000000001';
  perform public.update_booking_payment_item(p,'Revised installment',11000,current_date);
  if (select paid_cents from public.booking_payment_items where id=p) <> 5000 then
    raise exception 'Schedule edit changed receipt-derived paid amount';
  end if;
  begin
    perform public.update_booking_payment_item(p,'Too small',4000,current_date);
    raise exception 'Schedule was reduced below recorded receipts';
  exception when check_violation then null;
  end;
  begin
    perform public.delete_unpaid_booking_payment_item(p);
    raise exception 'Paid installment was deleted';
  exception when raise_exception then
    if sqlerrm = 'Paid installment was deleted' then raise; end if;
  end;
  insert into public.booking_payment_items (booking_id,label,amount_due_cents,due_on)
  values ('10000000-0000-0000-0000-000000000001','Entered by mistake',1000,current_date)
  returning id into disposable;
  perform public.delete_unpaid_booking_payment_item(disposable);
  if exists (select 1 from public.booking_payment_items where id=disposable) then
    raise exception 'Unpaid installment removal failed';
  end if;
end $$;
do $$ declare p uuid; receipt uuid; settlement uuid; begin
  select id into p from public.booking_payment_items
    where booking_id='10000000-0000-0000-0000-000000000001';
  insert into public.booking_receipts(booking_id,amount_cents,method,received_at)
    values('10000000-0000-0000-0000-000000000001',18000,'e_transfer',now()) returning id into settlement;
  begin
    perform public.record_reminder_delivery('payment',p,'email',null);
    raise exception 'Settled balance still allowed a payment reminder';
  exception when raise_exception then
    if sqlerrm <> 'Wedding balance is already paid; reconcile installment allocations' then raise; end if;
  end;
  delete from public.booking_receipts where id=settlement;
  select id into receipt from public.booking_receipts where payment_item_id=p;
  update public.booking_receipts set payment_item_id=null where id=receipt;
  if (select paid_cents from public.booking_payment_items where id=p) <> 0 then
    raise exception 'Unallocating receipt did not clear the installment total';
  end if;
  update public.booking_receipts set payment_item_id=p where id=receipt;
  if (select paid_cents from public.booking_payment_items where id=p) <> 5000 then
    raise exception 'Allocating existing receipt did not restore the installment total';
  end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
do $$ begin
  if (select count(*) from public.booking_financial_agreement) <> 0 or
    (select count(*) from public.booking_optional_charges) <> 0 or
    (select count(*) from public.booking_receipts) <> 0 or
    (select count(*) from public.booking_reminder_deliveries) <> 0 then
    raise exception 'Staff financial isolation failed';
  end if;
end $$;
select 'Step 7 receipts, reminders, and staff isolation checks passed';
