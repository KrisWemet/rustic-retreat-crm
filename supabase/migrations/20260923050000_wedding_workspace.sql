-- Admin working record for each confirmed wedding. No client access is granted yet.
create table if not exists public.booking_workspace (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  contract_sent_at timestamptz,
  contract_signed_at timestamptz,
  contract_reference text,
  camping_notes text,
  planning_notes text,
  operations_notes text,
  setup_owner text,
  readiness_owner text,
  checkout_owner text,
  updated_at timestamptz not null default now()
);
create table if not exists public.booking_tasks (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  area text not null check (area in ('planning', 'operations')),
  title text not null check (length(trim(title)) between 1 and 200),
  assigned_to text,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists booking_tasks_booking on public.booking_tasks (booking_id, due_at);
create table if not exists public.booking_payment_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  label text not null check (length(trim(label)) between 1 and 120),
  amount_due_cents integer not null check (amount_due_cents > 0),
  paid_cents integer not null default 0 check (paid_cents >= 0 and paid_cents <= amount_due_cents),
  due_on date not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  check ((paid_cents = 0 and paid_at is null) or (paid_cents > 0 and paid_at is not null))
);
create index if not exists booking_payment_items_booking on public.booking_payment_items (booking_id, due_on);
create table if not exists public.booking_activity (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  kind text not null check (kind in ('note', 'communication', 'change')),
  details text not null check (length(trim(details)) between 1 and 5000),
  actor_user_id uuid default auth.uid(),
  actor_label text,
  created_at timestamptz not null default now()
);
create index if not exists booking_activity_booking on public.booking_activity (booking_id, created_at desc);

alter table public.booking_workspace enable row level security;
alter table public.booking_tasks enable row level security;
alter table public.booking_payment_items enable row level security;
alter table public.booking_activity enable row level security;
create policy booking_workspace_admin on public.booking_workspace for all using (public.is_admin()) with check (public.is_admin());
create policy booking_tasks_admin on public.booking_tasks for all using (public.is_admin()) with check (public.is_admin());
create policy booking_payment_items_admin on public.booking_payment_items for all using (public.is_admin()) with check (public.is_admin());
create policy booking_activity_admin on public.booking_activity for all using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.booking_workspace, public.booking_tasks, public.booking_payment_items, public.booking_activity to authenticated;

create or replace function public.set_booking_activity_actor() returns trigger language plpgsql as $$
begin
  new.actor_user_id := auth.uid();
  new.actor_label := coalesce(auth.jwt()->>'email', 'System');
  return new;
end $$;
create trigger booking_activity_actor before insert on public.booking_activity
for each row execute function public.set_booking_activity_actor();

create or replace function public.log_booking_workspace_change() returns trigger language plpgsql as $$
declare changed text;
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    changed := concat_ws(', ',
      case when new.contract_sent_at is distinct from old.contract_sent_at then 'contract sent date' end,
      case when new.contract_signed_at is distinct from old.contract_signed_at then 'contract signed date' end,
      case when new.contract_reference is distinct from old.contract_reference then 'contract reference' end,
      case when new.camping_notes is distinct from old.camping_notes then 'camping notes' end,
      case when new.planning_notes is distinct from old.planning_notes then 'planning notes' end,
      case when new.operations_notes is distinct from old.operations_notes then 'operations notes' end,
      case when new.setup_owner is distinct from old.setup_owner then 'setup owner' end,
      case when new.readiness_owner is distinct from old.readiness_owner then 'readiness owner' end,
      case when new.checkout_owner is distinct from old.checkout_owner then 'checkout owner' end);
    if changed = '' then return new; end if;
  end if;
  insert into public.booking_activity (booking_id, kind, details)
  values (new.booking_id, 'change', case when tg_op = 'INSERT' then 'Wedding workspace created' else 'Wedding workspace updated: ' || changed end);
  return new;
end $$;
create trigger booking_workspace_log before insert or update on public.booking_workspace
for each row execute function public.log_booking_workspace_change();

create or replace function public.log_booking_task_change() returns trigger language plpgsql as $$
begin
  insert into public.booking_activity (booking_id, kind, details)
  values (coalesce(new.booking_id, old.booking_id), 'change',
    case when tg_op = 'DELETE' then 'Task removed: ' || old.title
      when tg_op = 'INSERT' then 'Task added: ' || new.title
      when new.completed_at is distinct from old.completed_at then
        case when new.completed_at is null then 'Task reopened: ' else 'Task completed: ' end || new.title
      else 'Task updated: ' || new.title ||
        case when new.assigned_to is distinct from old.assigned_to then ' (assignee changed)' else '' end ||
        case when new.due_at is distinct from old.due_at then ' (due date changed)' else '' end end);
  return coalesce(new, old);
end $$;
create trigger booking_task_log after insert or update or delete on public.booking_tasks
for each row execute function public.log_booking_task_change();

create or replace function public.log_booking_payment_change() returns trigger language plpgsql as $$
begin
  insert into public.booking_activity (booking_id, kind, details)
  values (coalesce(new.booking_id, old.booking_id), 'change',
    case when tg_op = 'DELETE' then 'Payment item removed: ' || old.label
      when tg_op = 'INSERT' then 'Payment item added: ' || new.label
      else 'Payment item updated: ' || new.label ||
        case when new.paid_cents is distinct from old.paid_cents then ' (paid amount changed to ' || new.paid_cents || ' cents)' else '' end ||
        case when new.paid_at is distinct from old.paid_at then ' (received date changed)' else '' end ||
        case when new.due_on is distinct from old.due_on then ' (due date changed)' else '' end end);
  return coalesce(new, old);
end $$;
create trigger booking_payment_log after insert or update or delete on public.booking_payment_items
for each row execute function public.log_booking_payment_change();
