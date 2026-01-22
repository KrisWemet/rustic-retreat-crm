-- 01_inquiry_status_enum.sql
-- Purpose: Ensure the inquiry_status enum exists and that public.inquiries.status
-- uses it with a sensible default. Safe to run once.

-- Create enum if missing (includes current app statuses + PRD pipeline stages)
do $$
begin
  if not exists (select 1 from pg_type t where t.typname = 'inquiry_status') then
    create type inquiry_status as enum (
      -- App statuses used today
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

-- If the inquiries table exists, enforce enum usage + defaults
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'inquiries'
  ) then
    -- Add column if missing
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'inquiries' and column_name = 'status'
    ) then
      alter table public.inquiries
        add column status inquiry_status default 'new'::inquiry_status;
    else
      -- Convert to enum if currently a non-enum column
      if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'inquiries'
          and column_name = 'status' and data_type <> 'USER-DEFINED'
      ) then
        -- Drop any existing default first to avoid cast errors
        alter table public.inquiries alter column status drop default;

        -- Convert values using a safe mapping; unknowns become 'new'
        alter table public.inquiries
          alter column status type inquiry_status using (
            case lower(status)
              when 'new' then 'new'::inquiry_status
              when 'viewing_scheduled' then 'viewing_scheduled'::inquiry_status
              when 'viewed' then 'viewed'::inquiry_status
              when 'booked' then 'booked'::inquiry_status
              when 'lost' then 'lost'::inquiry_status
              when 'inquiry' then 'inquiry'::inquiry_status
              when 'tour_scheduled' then 'tour_scheduled'::inquiry_status
              when 'approved' then 'approved'::inquiry_status
              when 'contract_sent' then 'contract_sent'::inquiry_status
              when 'contract_signed' then 'contract_signed'::inquiry_status
              when 'booking_confirmed' then 'booking_confirmed'::inquiry_status
              when 'pre_event_checklist' then 'pre_event_checklist'::inquiry_status
              when 'event_week' then 'event_week'::inquiry_status
              when 'post_event_inspection' then 'post_event_inspection'::inquiry_status
              else 'new'::inquiry_status
            end
          );
      end if;

      -- Ensure default is set after conversion
      alter table public.inquiries
        alter column status set default 'new'::inquiry_status;
    end if;

    -- Backfill nulls to 'new'
    update public.inquiries set status = 'new'::inquiry_status where status is null;
  end if;
end $$;
