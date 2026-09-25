-- Migration: Create inquiry_status enum and ensure inquiries.status uses it
-- Safe/idempotent operations with checks

-- 1) Create enum type if missing (includes both current app statuses and PRD pipeline stages)
do $$
begin
  if not exists (select 1 from pg_type t where t.typname = 'inquiry_status') then
    create type inquiry_status as enum (
      -- App statuses
      'new',
      'viewing_scheduled',
      'viewed',
      'booked',
      'lost',
      -- PRD pipeline stages
      'inquiry',
      'tour_scheduled',
      'approved',
      'contract_sent',
      'contract_signed',
      'booking_confirmed',
      'pre_event_checklist',
      'event_week',
      'post_event_inspection'
    );
  end if;
end $$;

-- 2) Ensure public.inquiries table exists (skip changes if it does not)
-- If your table lives elsewhere, adjust schema/name accordingly.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'inquiries'
  ) then
    -- a) If status column is missing, add it with default 'new'
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'inquiries' and column_name = 'status'
    ) then
      alter table public.inquiries
        add column status inquiry_status default 'new'::inquiry_status;
    else
      -- b) If status column exists but is not enum, convert it
      if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'inquiries'
          and column_name = 'status' and data_type <> 'USER-DEFINED'
      ) then
        alter table public.inquiries
          alter column status type inquiry_status using status::inquiry_status;
      end if;
      -- c) Ensure default is set to 'new'
      alter table public.inquiries
        alter column status set default 'new'::inquiry_status;
    end if;
    -- d) Backfill nulls to 'new'
    update public.inquiries set status = 'new'::inquiry_status where status is null;
  end if;
end $$;

