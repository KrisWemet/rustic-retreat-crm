# Rustic Retreat CRM: handoff notes

Last updated: 26 September 2026. Written so a new chat can pick up where the last one stopped.

## The business

- **Venue:** Rustic Retreat, an off-grid wedding venue at Lac La Nonne, Alberta.
- **Bookings:** one wedding at a time, with a reset day after each.
- **Owner:** Shannon Ouimet. **Admin:** Kris Wemet.
- **Pricing:** all package prices are **before 5% GST**.

| Package | 2027 price | 2028 price | Allowed dates |
|---|---|---|---|
| 3-Day Weekend | $6,500 | $7,500 | Fri–Sun |
| 5-Day Experience | $7,500 | $8,500 | Wed–Sun, Thu–Mon or Fri–Tue |
| 2-Day Weekday Escape | **Retired**: no longer sold | not offered | none |

- The 5-Day 2027 price comes from the 2027 agreement's price table and the seed data in repo B. If the live Packages page ever shows something different, check it there.
- **Guests:** the reception holds at most 100.
- **Payment schedule** (this matches Section 4 of the signed agreement):
  1. 25% deposit. How the deposit falls due depends on how the couple books:
     - **Agreement signed directly:** the deposit is due at signing.
     - **Proposal accepted online:** the deposit is due 7 days after acceptance.
  2. 25% due **180 days** (about 6 months) before check-in.
  3. The last 50% due **90 days** (about 3 months) before check-in.
  4. If a milestone has already passed when the couple books, it is due with the deposit.
- **2028 agreement:** same wording as 2027. Only the prices are new.

---

## There are two repos. Only one is the live CRM.

Both repos have their own PR numbers, and both have used the branch name `claude/great-gates-rohjoy`. So always write a PR with its repo, for example `KrisWemet/rusticretreat-crm#2`, never just "PR #2".

### Repo B: the CRM in use (`KrisWemet/rusticretreat-crm`, no hyphen)

- **Web addresses:** https://crm.rusticretreatalberta.ca for the admin CRM, and https://sign.rusticretreatalberta.ca for e-signing.
- **Stack:** Express, better-sqlite3 12.11.1 (pinned) and a React client.
- **Hosting:** Railway project **"refreshing-analysis"**. Railway deploys from the branch **`claude/wedding-crm-esign-integration-coau0z`**. The repo's default branch is `claude/wedding-venue-crm-23ycf5`.
- **Database:** a SQLite file on a Railway volume mounted at `/data`, with `DB_PATH` pointing to it. **It holds real couples.**
- **Access:** `CRM_PUBLIC=1` means there is no extra access gate in front of the app. The owner chose to keep it that way, because the admin CRM already requires the admin login (email set by `ADMIN_EMAIL_LOGIN`, plus a password). The gate would only add a second shared key (`CRM_GATE_KEY`). Don't reopen this decision.
- **Tests:** `npm test --prefix server` runs `node --test test/*.test.js`. All 27 tests passed as of commit `840a9a3`. GitHub Actions workflow: `.github/workflows/server-tests.yml`.
- **More notes** live in `PROJECT_STATE.md` in that repo.

### Repo A: the older, secondary CRM (`KrisWemet/rustic-retreat-crm`, with hyphen)

- **Stack:** React, Vite, TypeScript, Tailwind 4 and Supabase (project `aztaffrywreshzyzraiz`).
- **Hosting:** Vercel project `rustic_retreat_crm` at rusticretreatcrm.vercel.app.
- **Status:** no longer the main system. The plan is to retire it later.

---

## Work finished

### Repo A (older CRM): `KrisWemet/rustic-retreat-crm#2` and `#3`

- **CI:** added a frontend CI workflow and gated production migrations.
- **Supabase:** the project was backed up and reset. The old edge functions and storage buckets were deleted, and both admin accounts were set up.
- **Vercel:** the project was relinked to the right repo and deployed.
- **Login:** fixed the unstyled login page (a Tailwind v4 CSS layer-order problem), made it look more professional, and added a working password-reset flow. The owner signed in successfully.
- **Client portal:** **on hold**. Admin must be fully working before any client gets access.

### `KrisWemet/rusticretreat-crm#1`: booking rules (merged as `21400b8`, deployed)

- **Booking rules:** `server/services/bookingRules.js` adds `assertBookable(...)`.
  - **Double bookings:** blocked. A booking takes up its own dates plus a reset day.
  - **Blocked dates:** respected. Cancelled couples don't count.
  - **Date patterns:** the check-in days allowed for each package are enforced.
  - **Guests:** capped at 100.
  - **Race-proof:** the checks run inside SQLite transactions, so two requests at once can't both book the same dates.
- **Where the rules apply:**
  - Creating and editing bookings. An edit re-checks only when dates, package or guest count change.
  - Sending and accepting proposals. The public error message doesn't name the other couple.
  - Venue countersigning a contract.
- **Seeded accounts:** the startup step that resets demo couple passwords now touches only the seeded demo emails.
- **Tested:** the owner confirmed that double booking is now impossible.

### `KrisWemet/rusticretreat-crm#2`: payments, 2028 prices, demo clean-up (merged as `3866e60`)

- **One payment schedule everywhere:** `server/services/paymentSchedule.js` (`buildPaymentSchedule`) implements 25% / 25% at 180 days / 50% at 90 days. It is used by:
  - proposal acceptance (creates 3 invoices)
  - proposal print view
  - contract text generated from a proposal
  - Payments page "generate schedule", which deletes unpaid invoices and rebuilds them
- **Prices by wedding year:**
  - A new `packages.season_prices` column holds per-year prices, for example `{"2028": 7500}`.
  - `server/services/packagePricing.js` works out the right price for a wedding date.
  - Packages page: a new "Prices by wedding year" editor.
  - Proposals page: the package price follows the event year.
- **2028 agreement:** `server/contract-templates/rental-agreement-2028.js` is copied automatically from the 2027 template. Only the key, subtitle and price table differ.
  - A contract must use the agreement for the wedding's year.
  - Retired options (2-Day) are hidden unless a contract already chose one.
- **One-time startup migrations:** these run once, recorded in the `app_migrations` table via `runOnce`.
  - `package-season-prices-2028`: sets the 2028 prices.
  - `retire-2-day-package`: deactivates the 2-Day package.
  - `remove-demo-couples-2026-09`: production only. Deletes the 4 seeded sample couples and their tasks; real couples are kept.
- **Guests field:** the Bookings form now allows up to 100 guests (it was 80).

### `KrisWemet/rusticretreat-crm#3`: booking form start and end times removed (merged as `7d14525`, deployed)

- **Form:** the New/Edit Booking form no longer has the Start Time and End Time fields. Check-In Date and Check-Out Date are still there.
- **Existing bookings:** times already saved are kept and still show in the bookings list. Edits don't erase them.
- **Unchanged:** the database columns and contract times are not touched.
- **Deploy:** succeeded on Railway at 14:58 UTC on 26 Sep 2026. The startup logs showed no new errors.

---

## Open items

1. **Shannon & Chris booking shows $6,439.**
   - **Cause:** that number was typed by hand into the New Booking form on 25 Sep 2026 (Railway log `POST /api/bookings`). No code changed it.
   - **Correct total:** **$6,825**, which is $6,500 plus $325 GST.
   - **Fix (for the owner):** Bookings → Edit → Total Package Price `6825` → Update Booking. Then on Payments, regenerate the schedule. Check-in is 23 Jul 2027, so the invoices should be:

     | Payment | Amount | Due |
     |---|---|---|
     | Deposit (25%) | $1,706.25 | now |
     | Second payment (25%) | $1,706.25 | 24 Jan 2027 (180 days before) |
     | Final payment (50%) | $3,412.50 | 24 Apr 2027 (90 days before) |
   - **Offered improvement, not built yet:**
     - make the booking form's Package a dropdown
     - fill the price in automatically from the season price plus GST
     - warn when a typed total differs
2. **`KrisWemet/rusticretreat-crm#2` deploy: verified.** It deployed successfully at 00:58 UTC on 26 Sep 2026.
   - **Log results:** "Set 2028 prices on 2 package(s)" and "Removed 4 demo couple(s) and 6 demo task(s)". No migration errors.
   - **No "Deactivated 2-Day" line:** no *active* 2-Day package was found, so it was probably already switched off. Worth a glance on the Packages page.
3. **Later, optional:**
   - retire repo A (the Vercel project and Supabase project `aztaffrywreshzyzraiz`, including its `legacy_backup` schema)
   - turn on Supabase leaked-password protection
   - add camping tracking
   - confirm the cancellation wording in the agreement

---

## Rules to keep following

- **Never run `reset-data.js` on the live database.** It holds real couples.
- **Back up before risky changes:** download a backup from Railway (service → Volume → Backups) first.
- **Secrets** go straight into Railway or GitHub settings, never into chat. Never put a Supabase service-role key in a `VITE_` variable.
- **Client portal** stays on hold until the owner says otherwise.
- **The CRM access gate** stays off (`CRM_PUBLIC=1`).
- **Totals** entered in the CRM should include 5% GST.
- **Git:** work on a `claude/...` branch, open a PR, and the owner merges it. Railway deploys from `claude/wedding-crm-esign-integration-coau0z`.
