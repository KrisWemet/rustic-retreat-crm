-- 07_fix_inquiries_schema.sql
-- Purpose: Ensure inquiries table has required columns/defaults used by the app
-- (created_at for ordering, id default UUID, status enum+default), and policy.
-- Safe to run once; only adds/adjusts where missing.

create extension if not exists pgcrypto;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'inquiries'
  ) then

    -- Ensure created_at exists (used by order=created_at.desc)
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'inquiries' and column_name = 'created_at'
    ) then
      alter table public.inquiries
        add column created_at timestamptz not null default now();
    end if;

    -- Ensure id has UUID default generator if column is uuid
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'inquiries' and column_name = 'id' and data_type = 'uuid'
    ) then
      begin
        alter table public.inquiries
          alter column id set default gen_random_uuid();
      exception when others then
        -- Ignore if not needed or already set
        null;
      end;
    end if;

    -- Ensure status column is inquiry_status with default 'new'
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'inquiries' and column_name = 'status'
    ) then
      -- Create enum if somehow missing
      if not exists (select 1 from pg_type t where t.typname = 'inquiry_status') then
        create type inquiry_status as enum ('new');
      end if;
      alter table public.inquiries
        add column status inquiry_status default 'new'::inquiry_status;
    else
      -- If status exists, try to set default to 'new'
      begin
        alter table public.inquiries
          alter column status set default 'new'::inquiry_status;
      exception when others then
        -- If status is text or another type, try to convert via safe case mapping
        if exists (
          select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'inquiries' and column_name = 'status' and data_type <> 'USER-DEFINED'
        ) then
          alter table public.inquiries alter column status drop default;
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
          alter table public.inquiries
            alter column status set default 'new'::inquiry_status;
        end if;
      end;
    end if;

    -- Recreate admin policy if missing
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'inquiries' and policyname = 'inquiries_admin_all'
    ) then
      execute $POLICY$
        create policy inquiries_admin_all on public.inquiries
          for all
          using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
          with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));
      $POLICY$;
    end if;

  end if;
end $$;
