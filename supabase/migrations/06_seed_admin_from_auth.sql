-- 06_seed_admin_from_auth.sql
-- Purpose: Promote Shannon to admin, pulling her email from auth.users to satisfy
--          NOT NULL constraints on public.users.email when present.
-- Usage: run as-is (UUID set below). If you have a different admin, change v_id.

do $$
declare
  v_id uuid := '6ce07aac-8fa7-4153-97c1-f827b773f3b0';
  v_email text;
  has_email_column boolean;
begin
  select email into v_email from auth.users where id = v_id;
  if v_email is null then
    raise exception 'Auth user not found or has null email for id %', v_id;
  end if;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users' and column_name = 'email'
  ) into has_email_column;

  if exists (select 1 from public.users where id = v_id) then
    update public.users set role = 'admin' where id = v_id;
  else
    if has_email_column then
      insert into public.users (id, role, email)
      values (v_id, 'admin', v_email);
    else
      insert into public.users (id, role)
      values (v_id, 'admin');
    end if;
  end if;
end $$;

