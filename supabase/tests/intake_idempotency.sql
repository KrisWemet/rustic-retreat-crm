-- A retried website submission must return the original lead, not create another.
do $$ declare first_id uuid; second_id uuid; payload jsonb := jsonb_build_object(
  'email', 'intake-test@example.com', 'submissionId', 'replay-001',
  'partner1FirstName', 'Taylor', 'weddingDate', '2027-09-18',
  'preferredContact', 'text');
begin
  first_id := public.import_website_inquiry(payload, repeat('a', 64));
  second_id := public.import_website_inquiry(payload, repeat('a', 64));
  if first_id is distinct from second_id or
    (select count(*) from public.inquiries where email = 'intake-test@example.com') <> 1 or
    (select count(*) from public.website_intake_submissions where submission_id = 'replay-001') <> 1 then
    raise exception 'Website retry created a duplicate inquiry';
  end if;
  second_id := public.import_website_inquiry(payload || jsonb_build_object(
    'submissionId','replay-002','preferredContact','email',
    'preferredEmail','reminders@example.com','phone','7805550199'),repeat('a',64));
  if second_id is distinct from first_id or
    (select preferred_contact_email from public.inquiries where id=first_id) <> 'reminders@example.com' or
    (select phone from public.inquiries where id=first_id) <> '7805550199' then
    raise exception 'Follow-up contact preference failed to update the existing lead';
  end if;
end $$;
select 'Website duplicate-submission check passed';
