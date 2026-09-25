begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
insert into public.booking_receipts(booking_id,payment_item_id,amount_cents,method,received_at)
values ('10000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000099',3000,'e_transfer',now());
select pg_sleep(1);
commit;
