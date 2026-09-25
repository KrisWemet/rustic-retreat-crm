# Camping and property operations

Open a confirmed wedding from **Bookings**. The **Camping and property operations** section is the working record for the property team. Its **Print weekend sheet** button opens a print-friendly page with current camping counts, cabin guests, vendor arrival and power details, weather decision, emergency contacts, and readiness checks. The sheet deliberately omits payment and damage-deposit amounts. Printed copies contain private contact information; store or dispose of them accordingly.

## Camping and cabin

Record each RV or tent group with occupants, unit length if relevant, contact, arrival and departure dates, and an optional site or area. Arrival is the first overnight stay; departure is checkout and is not counted as another night. A Friday–Sunday stay therefore counts Friday and Saturday nights. The nightly table counts actual registered groups, not the estimate captured at booking. The database rejects a night above 60 campers or 15 RVs, even if two admins submit changes at the same time. Eight RVs and 12 tents are included in the public offer; counts above those allowances are flagged for contract review. No extra-unit charge is inferred. The cabin is tracked separately and limited to four occupants within the booking dates.

The estimated `guest_camping_count` and `rv_count` on the booking remain the agreed planning snapshot. Reconcile the actual roster against the couple's contract before changing charges. A site or area label is optional; add a map only if placement assignments become a recurring need.

## Property preparation and checkout

Record vendor arrival/departure times, on-site contact, electrical needs, and access notes. Add emergency contacts and a weather forecast, contingency plan, decision, and decision time. Eight default checks cover water, wash house, solar/power, grounds, supplies, camping arrivals, weather, and checkout. Assign an owner, note exceptions, and mark each check complete. The dashboard flags an empty camping register, missing contacts or weather plan, and open pre-event checks for the next wedding.

At checkout, record inspection notes, completion time, and photos. Photos upload to a private Supabase Storage bucket (`wedding-inspections`), accept JPG/PNG/WebP up to 10 MB, and display through one-hour signed links. The bucket and photo metadata permit admin access only. Review storage retention manually; deleting a booking will cascade metadata but does not automatically remove uploaded objects from Storage.

The separate damage-deposit record accepts the amount agreed in the signed contract, actual received/refunded/retained amounts and dates, and reconciliation notes. The database prevents refunds plus retained amounts from exceeding receipts. It is not a bank ledger or automatic refund system. Do not enter a guessed deposit amount.

## Deployment

Apply `20260923060000_camping_operations.sql` after the first five numbered CRM migrations. It creates a private Supabase Storage bucket and policies, so apply it in the CRM Supabase project before deploying the interface. The full migration chain and capacity/deposit constraints were tested in disposable PostgreSQL 16 with a Supabase Auth and Storage schema stub. Build, lint, and unit tests should pass before rollout. Once deployed, create a test booking and verify photo upload/download under an admin account and denial under a non-admin account against the real Supabase Storage service.
