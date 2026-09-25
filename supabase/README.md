# Supabase migrations

This repo uses the Supabase CLI for database migrations. Apply migrations locally with the CLI or run the manual GitHub Actions workflow after reviewing the pending SQL.

## GitHub Actions (recommended)

1. In your GitHub repository settings, add the following Secrets:
   - `SUPABASE_ACCESS_TOKEN`: A personal access token from supabase.com (Account Settings → Access Tokens).
   - `SUPABASE_PROJECT_REF`: Your project ref (e.g., `abcdxyz12345`).
   - `SUPABASE_DB_PASSWORD`: Your project database password (Project Settings → Database → Connection string password).

2. Commit SQL files to `supabase/migrations/*.sql`.

3. Review the pending SQL and trigger the “Supabase Migrations” workflow manually. Pushing a branch does not apply production migrations.

The workflow links to your project, previews pending migrations with `supabase db push --dry-run`, then runs `supabase db push`.

## Local usage

Prereqs: Install the Supabase CLI (see docs: https://supabase.com/docs/guides/cli).

1. Authenticate: `supabase login` (uses `SUPABASE_ACCESS_TOKEN`).
2. Link: `supabase link --project-ref <PROJECT_REF> --password <DB_PASSWORD>`.
3. Preview: `supabase db push --dry-run`.
4. Apply after reviewing the output: `supabase db push`.

## Migrations

Place executable SQL files under `supabase/migrations/` using Supabase CLI's 14-digit timestamp format, for example `20260923010000_single_inventory_calendar.sql`. The older manual scripts are preserved in `supabase/legacy/` and are not part of `db push`.

The first CLI-managed migration is `20260922000000_baseline.sql`. It creates missing base tables and normalizes policies but does not create an admin account. On an existing database, inspect live schema and migration history before running `db push --dry-run`; resolve any historical data conflicts described in `Documentation/Calendar_rules.md` before applying the calendar constraint. Production credentials are not stored in this repository.

## Database checks

Run `bash supabase/tests/run.sh` with Docker available. It applies the complete migration chain to a disposable PostgreSQL 16 container, then checks verified account linking, wedding isolation, the workspace-to-operations-to-portal handoff, receipts and reminders, website submission replay, and two simultaneous attempts to reserve the same dates. The `Database Checks` workflow runs this on pushes and pull requests. These local checks do not replace a final Auth, Storage, and migration smoke test in the linked Supabase project.
