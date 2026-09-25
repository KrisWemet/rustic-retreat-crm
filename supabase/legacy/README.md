# Legacy SQL

These are the original manual setup, repair, diagnostic, and admin-seed scripts. They are preserved for history but do not have valid Supabase CLI migration filenames. Do not run them as a sequence: some overlap, one contains a hard-coded admin UUID, and the old self-upsert policy could let users change their role. The timestamped baseline in `../migrations/20260922000000_baseline.sql` replaces them for CLI-managed migrations.
