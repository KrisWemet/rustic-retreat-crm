# Steps 1–7 integration verification

Reviewed the CRM and the sibling `rustic-retreat-weddings` website together on September 25, 2026. These are local verification results, not a production deployment certification.

| Area | Cross-feature checks |
| --- | --- |
| Package rules and conversion | Approved price snapshots, 100-person reception cap, explicit overage above 80, all three five-day windows, fresh conversion form per inquiry |
| Calendar | Linked hold consumed atomically, reset day protected, duplicate conversion rejected, failed conversion leaves no partial booking or changed lead, simultaneous authenticated conversions allow one booking |
| Website intake and leads | Service-role import, repeated submission returns the same lead, flexible dates preserved, follow-up updates contact preferences without changing the primary email used to identify the lead |
| Wedding workspace | Confirmed wedding seeds property checks; booked inquiry cannot be deleted or moved back into sales stages; updated lead details pass into conversion |
| Operations | Actual camping data reaches assigned portal users; readiness changes are allowed for assigned staff; activity and print-sheet queries refresh after edits |
| Permissions | Separate partner memberships, verified email before linking, staff/family finance isolation, cross-wedding denial, per-account query caches cleared on sign-out or account switch |
| Finance and reminders | Receipt-derived installment totals, guarded schedule corrections, receipt allocation, concurrent receipt totals, separate damage deposits, preferred reminder email, completion/cooldown checks, payment reminders stop when the overall wedding balance is paid |

The main database journey is `supabase/tests/all_steps_integration.sql`; it uses service-role intake and authenticated admin RPCs, then switches to staff and another couple. Other database and application tests cover capacity logic, grants, deposit separation, receipt allocation, and concurrency. `supabase/tests/run.sh` creates and removes a disposable PostgreSQL 16 container and applies every migration. Auth and Storage schemas are local stubs; live services are not exercised.

Application verification includes 30 CRM tests, four website intake tests, TypeScript checks, both production builds, and lint. The CRM retains two existing React Compiler compatibility warnings; the website lint is clean. An existing website analytics type error was corrected so its TypeScript check also passes.

## Remaining live release checks

Apply the reviewed migration chain and configure the CRM and website environment variables against the intended Supabase project. Verify actual email confirmation, separate partner login, role linking, and private inspection photo upload/download under real accounts. Submit a real test website inquiry and confirm the Formspree notification and CRM record. These live checks have not been run and no production deployment was made during this review.

Reminders remain manually sent through the selected email/text/phone application and manually logged. The website's CRM copy remains best-effort after Formspree succeeds, with Formspree as the reconciliation fallback. The Reports route is still an explicitly labelled placeholder, outside the seven-step first release.
