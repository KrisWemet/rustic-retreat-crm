-- 09_fix_inquiries_types_and_index.sql
-- Purpose: Harden the inquiries table types for app queries and performance.
-- - Ensure created_at is timestamptz with default now()
-- - Add an index on created_at for ordering

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'inquiries'
  ) then
    -- If created_at exists but is not timestamptz, attempt to convert
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'inquiries' and column_name = 'created_at' and data_type <> 'timestamp with time zone'
    ) then
      begin
        alter table public.inquiries
          alter column created_at type timestamptz using created_at::timestamptz;
      exception when others then
        -- If conversion fails due to incompatible data, leave as-is and rely on 07 to have added a proper column
        null;
      end;
    end if;

    -- Ensure default now() on created_at
    begin
      alter table public.inquiries
        alter column created_at set default now();
    exception when others then null; end;

    -- Create index for order by created_at desc if not present
    create index if not exists idx_inquiries_created_at on public.inquiries (created_at desc);
  end if;
end $$;

