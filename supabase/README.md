# Supabase migrations

This repo uses the Supabase CLI for database migrations. You can apply migrations to your Supabase project either locally (with the CLI installed) or automatically via GitHub Actions.

## GitHub Actions (recommended)

1. In your GitHub repository settings, add the following Secrets:
   - `SUPABASE_ACCESS_TOKEN`: A personal access token from supabase.com (Account Settings → Access Tokens).
   - `SUPABASE_PROJECT_REF`: Your project ref (e.g., `abcdxyz12345`).
   - `SUPABASE_DB_PASSWORD`: Your project database password (Project Settings → Database → Connection string password).

2. Commit SQL files to `supabase/migrations/*.sql`.

3. Trigger the workflow:
   - On push to any `*.sql` under `supabase/migrations/`, or
   - Manually via the “Supabase Migrations” workflow (workflow_dispatch).

The workflow links to your project and runs `supabase db push` to apply any pending migrations.

## Local usage

Prereqs: Install the Supabase CLI (see docs: https://supabase.com/docs/guides/cli).

1. Authenticate: `supabase login` (uses `SUPABASE_ACCESS_TOKEN`).
2. Link: `supabase link --project-ref <PROJECT_REF> --password <DB_PASSWORD>`.
3. Push: `supabase db push`.

## Migrations

Place your SQL files under `supabase/migrations/` using the standard timestamped naming (e.g., `20260120T120000_init.sql`).

Example starter template:

```sql
-- Example: create inquiries status enum and apply to table
-- begin;
-- create type inquiry_status as enum (
--   'inquiry',
--   'tour_scheduled',
--   'approved',
--   'contract_sent',
--   'contract_signed',
--   'booking_confirmed',
--   'pre_event_checklist',
--   'event_week',
--   'post_event_inspection'
-- );
-- alter table public.inquiries
--   add column if not exists status inquiry_status default 'inquiry';
-- commit;
```

