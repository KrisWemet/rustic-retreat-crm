set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select public.confirm_booking_from_inquiry('20000000-0000-0000-0000-000000000011', 'three_day',
  '2027-06-25', '2027-06-27', 80, 20, 2, terms, null)
from public.booking_package_catalog where season = 2027 and package = 'three_day';
