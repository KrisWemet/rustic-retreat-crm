# Supabase migrations

This repo uses the Supabase CLI for database migrations. Apply migrations locally with the CLI or run the manual GitHub Actions workflow after reviewing the pending SQL.

## GitHub Actions (recommended)

1. In your GitHub repository settings, add the following Secrets:
   - `SUPABASE_ACCESS_TOKEN`: A personal access token from supabase.com (Account Settings → Access Tokens).
   - `SUPABASE_PROJECT_REF`: Your project ref (e.g., `abcdxyz12345`).
   - `SUPABASE_DB_PASSWORD`: Your project database password (Project Settings → Database → Connection string password).

   Keep these as **repository** secrets. The preview job needs them before approval, so moving them into the `production` environment would break it.

2. Create the approval gate (one time): **Settings → Environments → New environment**, name it `production`, tick **Required reviewers**, and add the person who approves database changes. Under **Deployment branches and tags**, choose **Selected branches** and allow only `master`. Until required reviewers are set, GitHub creates the environment on first use with no protection and the apply job runs without pausing.

3. Commit SQL files to `supabase/migrations/*.sql` and merge them to `master`.

4. Trigger the “Supabase Migrations” workflow manually from `master`. Pushing a branch does not apply production migrations.

The workflow runs three jobs in order:

1. **Verify** refuses any branch except `master`, then runs the database checks below against a disposable PostgreSQL container. A failing check stops the run before production is touched.
2. **Preview** links to the project and runs `supabase db push --dry-run`. The list of pending migrations appears in the run summary.
3. **Apply** waits for a required reviewer to approve the `production` environment, then runs `supabase db push`. Read the preview summary before approving. Rejecting the approval leaves the database unchanged.

Only one migration run can be active at a time; a second run waits for the first to finish.

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
