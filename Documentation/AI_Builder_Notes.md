# Rustic Retreat CRM — Builder Notes & Implementation Guide

Last updated: 2026-01-20

## Overview

This file tracks how the current implementation aligns to the PRD, Tech Stack, and Implementation Plan, and provides practical build directions, conventions, and next steps.

## Alignment Snapshot

- Frontend: React + TypeScript + Vite + Tailwind (aligned with Tech Stack: React/TS + Vite).
- State/Data: TanStack Query (installed and used for inquiries) — aligned.
- Auth/Backend: Supabase client wired; minimal usage so far (auth helpers + inquiries CRUD). RLS/policies not configured here (out of scope for client-only repo) — pending Phase 1 work in Supabase.
- UI: Tailwind-based custom components; no shadcn/ui yet (optional per Tech Stack doc).
- Tests: Vitest + Testing Library set up; smoke tests added.

## What’s Implemented (Phase Coverage)

- Phase 2 (Inquiry & Lead Management):
  - Inquiries list with React Query (`getInquiries`).
  - Create Inquiry modal with RHF + Zod and `createInquiry`.
  - Detail modal with View/Edit/Delete (`updateInquiry`, `deleteInquiry`).
  - Status display supported (badge only). Full pipeline stages not enforced yet.

- Phase 1 (DB & Auth):
  - Supabase client in `src/lib/supabase/client.ts`.
  - Basic auth helpers (`signIn`, `signOut`, `getCurrentUser`).
  - RLS policies, roles, and schema migrations are not in this repo — needs Supabase migrations.

- Scaffolding:
  - Admin layout and routing under `/admin/*`.
  - Placeholders for other admin pages (Bookings, Calendar, Payments, Reports).

## Gaps vs. PRD

- Roles & RLS (CRITICAL): Not implemented here. Requires Supabase SQL migrations:
  - `users` with role enum (admin, client, family) and RLS across tables.
  - Policies to scope data access.
- Inquiry Pipeline: PRD defines multiple stages (Inquiry → Tour/Call scheduled → Approved → Contract sent → Contract signed → Booking confirmed → Pre-event checklist → Event week → Post-event inspection). Current UI shows a generic `status` string. We should formalize an enum and transitions.
- Calendar & Booking Validation (Phase 3): Not implemented. Requires schema (bookings, blackout dates), date rules, and conflict detection.
- Payments & Upsells (Phase 4): Not implemented. Requires tables, Stripe integration (via Supabase Edge Functions), and calculation logic.
- Client Portal (Phase 5): Not started.
- Workflows & Comms (Phase 7): Not started. Requires Edge Functions + secrets.

## Data Model (Current vs. Target)

- Current `inquiries` fields used client-side:
  - `id`, `full_name`, `email`, `phone`, `wedding_date_estimate`, `source`, `status`, `notes`, `created_at`.
- Target enhancements:
  - `status` should be enum with the PRD pipeline stages.
  - Optional: capture additional lead metadata (guests, channel details) per PRD.

## Build Directions (Practical Guide)

1) Environment
- Ensure `.env.local` contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Never expose service keys in the client; reserve for Edge Functions.

2) Install & Run
- Install: `npm install`
- Dev server: `npm run dev`
- Tests: `npm run test` or `npm run test:watch`

3) Project Structure
- `src/lib/supabase/` — client + queries by domain. Prefer `queries/<domain>.ts` to centralize DB calls.
- `src/hooks/` — React Query hooks per domain (`useInquiries`, `useCreateInquiry`, `useUpdateInquiry`, `useDeleteInquiry`).
- `src/components/` — Reusable UI (modals, forms).
- `src/pages/` — Route-level pages; nest under `/admin` as needed.
- `src/layouts/` — Shared layouts; `AdminLayout` wraps admin routes.

4) Conventions
- Type imports: use `import type { ... }` to avoid runtime import issues with Vite + TS `verbatimModuleSyntax`.
- Queries: return typed data, handle nulls (`data || []`).
- React Query keys: stable arrays (e.g., `['inquiries']`); invalidate on mutations.
- UI: Tailwind classes, keep contrast high and spacing generous.

5) Testing Approach
- Use Vitest + Testing Library. Start with smoke tests at the page/layout level.
- Mock data-fetching hooks in page tests; add component interaction tests for modals.
- Future: add booking validation unit tests as pure functions.

## Next Steps (Recommended)

1. Supabase Migrations (Phase 1)
- Add schema for roles, RLS policies, `inquiries` enum status, and seed data for local.

2. Inquiry Pipeline UX (Phase 2)
- Replace free-text `status` with enum; add status change actions in the detail modal.
- Add filters and search on the list.

3. Booking & Calendar (Phase 3)
- Create tables for `bookings`, `blackouts`, `holds`.
- Implement package date rules and reset constraints as a reusable validator.
- Calendar UI (month/week) with single-inventory visualization.

4. Payments & Upsells (Phase 4)
- Tables: `payments`, `upsells`; Stripe integration via Edge Functions.
- Payment schedule generator + cancellation policy logic.

5. Comms & Workflows (Phase 7)
- Edge Functions for Twilio/Resend; `pg_cron`-driven workflow executor.

## Open Questions

- Should we add shadcn/ui for standardized components (dialogs, tables) or keep raw Tailwind for now?
- Precise mapping of Inquiry sources and any required validation?
- Admin vs. client-facing access for inquiries (admin-only in Phase 2)?

---

Maintainer: AI Builder (this file is for build notes; feel free to extend with decisions and rationale as the project evolves.)

## Supabase Automation (No Copy/Paste SQL)

We added a GitHub Action to push migrations directly to Supabase. Provide the following GitHub repository secrets:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`

Then commit SQL files under `supabase/migrations/`. The workflow `.github/workflows/supabase-migrations.yml` runs `supabase link` and `supabase db push` to apply changes to your project.

For local application, install the Supabase CLI and run `supabase link` + `supabase db push`.
