# Single-inventory calendar

The calendar uses one `calendar_blocks` table for confirmed bookings, pending holds, and owner blackouts. Dates are inclusive. A booking or hold occupies its event dates **and the following calendar day for reset**. A blackout occupies only its selected dates. PostgreSQL's GiST exclusion constraint rejects overlapping occupied ranges, including simultaneous requests from different users or services.

New bookings are created through `confirm_booking_from_inquiry`. That database transaction expires old holds, locks the inquiry, releases any active hold tied to it, creates the booking and its calendar block, then moves the inquiry to `booking_confirmed`. A conflict or other error rolls back every step. The database also rejects a second confirmed booking for the same inquiry. Direct writes to bookings and calendar blocks are revoked from authenticated clients.

Holds have an expiry timestamp. Reading the calendar or creating a reservation marks elapsed holds expired before returning availability. The calendar form can link a hold to an inquiry so converting that inquiry consumes its hold. Admins can release holds and blackouts; the booking cancellation function is available for a later financial cancellation workflow.

The database enforces the currently offered package windows: 3-day Friday–Sunday and 5-day Wednesday–Sunday, Thursday–Monday, or Friday–Tuesday. The booking terms snapshot and guest limits from [Current package rules](Current_package_rules.md) remain required.

## Before applying migrations

Apply `20260922000000_baseline.sql` followed by `20260923000000_booking_terms_snapshot.sql`, `20260923010000_single_inventory_calendar.sql`, and `20260923020000_active_calendar_read.sql` in order. The calendar migration imports existing bookings as confirmed reservations. It deliberately fails if historical bookings conflict or if an inquiry has more than one confirmed booking; resolve those against the original contracts before retrying.

To identify date or reset conflicts in the current bookings table:

```sql
select a.id as first_booking, b.id as second_booking
from public.bookings a
join public.bookings b on a.id < b.id
where daterange(a.start_date, a.end_date + 2, '[)')
   && daterange(b.start_date, b.end_date + 2, '[)');
```

To find duplicate inquiry conversions:

```sql
select inquiry_id, count(*)
from public.bookings
where inquiry_id is not null
group by inquiry_id
having count(*) > 1;
```

The migrations remove the old user self-upsert policy because it let clients change their own role. Auth creates the initial client profile; browsers cannot insert or update role rows. Admin-controlled membership functions assign wedding access; see [Permissions](Permissions.md).

## Verified locally

These migrations were applied to disposable PostgreSQL 16 databases. Tests covered a linked hold converting to a booking, a conflicting booking rolling back without changing its inquiry, a reset-day conflict, an allowed reservation after the reset day, expired holds releasing their dates on both reads and writes, rejection of a client's attempt to become admin, two simultaneous booking attempts with one success, and import of a historical 2-day booking. The production Supabase database has not been migrated.
