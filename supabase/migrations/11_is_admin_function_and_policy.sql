-- 11_is_admin_function_and_policy.sql
-- Purpose: Avoid complex subqueries inside RLS predicates by using a
-- SECURITY DEFINER helper that checks if the current auth.uid() is admin.

-- 1) Create helper function
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  );
$$;

-- Allow authenticated users to execute it (used by RLS)
grant execute on function public.is_admin() to authenticated;

-- 2) Replace inquiries policy to use the function
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'inquiries'
  ) then
    -- Ensure RLS enabled
    execute 'alter table public.inquiries enable row level security';

    -- Drop existing policy if present
    if exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = 'inquiries' and policyname = 'inquiries_admin_all'
    ) then
      execute 'drop policy inquiries_admin_all on public.inquiries';
    end if;

    -- Recreate using function
    execute $POLICY$
      create policy inquiries_admin_all on public.inquiries
        for all
        using (public.is_admin())
        with check (public.is_admin());
    $POLICY$;
  end if;
end $$;

