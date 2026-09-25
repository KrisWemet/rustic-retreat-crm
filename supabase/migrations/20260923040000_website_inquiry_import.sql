create table if not exists public.website_intake_requests (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  email_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists website_intake_requests_lookup on public.website_intake_requests (ip_hash, created_at desc);
create index if not exists website_intake_requests_email_lookup on public.website_intake_requests (email_hash, created_at desc);
alter table public.website_intake_requests enable row level security;
create table if not exists public.website_intake_submissions (
  submission_id text primary key,
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.website_intake_submissions enable row level security;

create or replace function public.import_website_inquiry(payload jsonb, request_ip_hash text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  email_value text := lower(trim(payload->>'email'));
  submission_value text := nullif(trim(payload->>'submissionId'), '');
  date_value text := nullif(trim(payload->>'weddingDate'), '');
  existing_id uuid;
  message_value text;
  email_digest text := encode(digest(email_value, 'sha256'), 'hex');
begin
  if length(email_value) < 5 or length(email_value) > 254
    or email_value !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$'
    or length(coalesce(payload->>'partner1FirstName', '')) < 1
    or length(coalesce(payload->>'partner1FirstName', '')) > 120
    or submission_value is null or length(submission_value) > 100
    or length(request_ip_hash) <> 64 then
    raise exception 'Invalid website inquiry';
  end if;
  perform pg_advisory_xact_lock(hashtext(email_value));
  delete from public.website_intake_requests where created_at < now() - interval '30 days';
  select inquiry_id into existing_id from public.website_intake_submissions
    where submission_id = submission_value;
  if existing_id is not null then return existing_id; end if;
  if (select count(*) from public.website_intake_requests
      where ip_hash = request_ip_hash and created_at > now() - interval '1 hour') >= 15 then
    raise exception 'Intake rate limit exceeded';
  end if;
  if (select count(*) from public.website_intake_requests
      where email_hash = email_digest and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Intake rate limit exceeded';
  end if;
  insert into public.website_intake_requests (ip_hash, email_hash) values (request_ip_hash, email_digest);

  message_value := concat_ws(E'\n',
    nullif(trim(payload->>'message'), ''),
    case when nullif(trim(payload->>'guestCount'), '') is not null then 'Guests: ' || left(trim(payload->>'guestCount'), 100) end,
    case when nullif(trim(payload->>'tourDates'), '') is not null then 'Tour dates requested: ' || left(trim(payload->>'tourDates'), 500) end);

  -- Repeated contact from the same couple about the same date updates the open lead.
  select id into existing_id from public.inquiries
    where lower(trim(email)) = email_value
      and (coalesce(wedding_date_estimate, '') = coalesce(date_value, '')
        or payload->>'inquiryType' like 'Booking request %')
      and coalesce(status, 'new') not in ('lost', 'booked', 'booking_confirmed', 'pre_event_checklist', 'event_week', 'post_event_inspection')
      and created_at > now() - interval '180 days'
    order by created_at desc limit 1 for update;
  if existing_id is not null then
    update public.inquiries set
      notes = concat_ws(E'\n\n', nullif(notes, ''), '[Website follow-up ' || to_char(now(), 'YYYY-MM-DD') || ']' || E'\n' || coalesce(message_value, 'No message')),
      partner_name = coalesce(partner_name, nullif(left(trim(payload->>'partner2FirstName'), 120), '')),
      phone = coalesce(nullif(left(trim(payload->>'phone'), 100), ''), phone),
      preferred_contact_email = coalesce(nullif(left(trim(payload->>'preferredEmail'), 254), ''), preferred_contact_email),
      wedding_date_estimate = case when payload->>'inquiryType' like 'Booking request %'
        then coalesce(left(date_value, 200), wedding_date_estimate) else wedding_date_estimate end,
      estimated_guests = coalesce(nullif(left(trim(payload->>'guestCount'), 100), ''), estimated_guests),
      preferred_contact = coalesce(nullif(left(trim(payload->>'preferredContact'), 20), ''), preferred_contact),
      inquiry_type = coalesce(nullif(left(trim(payload->>'inquiryType'), 50), ''), inquiry_type),
      preferred_tour_dates = coalesce(nullif(left(trim(payload->>'tourDates'), 500), ''), preferred_tour_dates)
    where id = existing_id;
    insert into public.website_intake_submissions (submission_id, inquiry_id) values (submission_value, existing_id);
    return existing_id;
  end if;

  insert into public.inquiries (
    full_name, partner_name, email, phone, wedding_date_estimate, estimated_guests,
    preferred_contact, preferred_contact_email, preferred_tour_dates, inquiry_type, landing_source,
    source, notes, status, external_submission_id
  ) values (
    left(trim(payload->>'partner1FirstName'), 120),
    nullif(left(trim(payload->>'partner2FirstName'), 120), ''), email_value,
    nullif(left(trim(payload->>'phone'), 100), ''), left(date_value, 200),
    nullif(left(trim(payload->>'guestCount'), 100), ''),
    nullif(left(trim(payload->>'preferredContact'), 20), ''),
    nullif(left(trim(payload->>'preferredEmail'), 254), ''),
    nullif(left(trim(payload->>'tourDates'), 500), ''),
    nullif(left(trim(payload->>'inquiryType'), 50), ''),
    nullif(left(trim(payload->>'landingSource'), 500), ''),
    'Website', left(message_value, 5000), 'new', submission_value
  ) returning id into existing_id;
  insert into public.website_intake_submissions (submission_id, inquiry_id) values (submission_value, existing_id);
  return existing_id;
end;
$$;
revoke all on function public.import_website_inquiry(jsonb, text) from public, anon, authenticated;
grant execute on function public.import_website_inquiry(jsonb, text) to service_role;
