-- Sales details remain on inquiries; booked-wedding preparation remains on bookings.
alter table public.inquiries
  add column if not exists partner_name text,
  add column if not exists preferred_contact text,
  add column if not exists preferred_contact_email text,
  add column if not exists estimated_guests text,
  add column if not exists preferred_tour_dates text,
  add column if not exists inquiry_type text,
  add column if not exists landing_source text,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists tour_at timestamptz,
  add column if not exists tour_outcome text,
  add column if not exists lost_reason text,
  add column if not exists status_changed_at timestamptz not null default now(),
  add column if not exists external_submission_id text;

-- No historical stage transitions exist; creation time is the only honest backfill.
update public.inquiries set status_changed_at = created_at;

create unique index if not exists inquiries_external_submission_id_unique
  on public.inquiries (external_submission_id)
  where external_submission_id is not null;

create or replace function public.set_inquiry_status_changed_at()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists inquiry_status_changed_at on public.inquiries;
create trigger inquiry_status_changed_at before update on public.inquiries
for each row execute function public.set_inquiry_status_changed_at();
