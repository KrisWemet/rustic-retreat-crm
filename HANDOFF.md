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
  - **Other arrangements:** the venue sometimes agrees a different plan with a couple. For example, one couple paid the deposit in two payments two weeks apart. The Payments page supports this (see `KrisWemet/rusticretreat-crm#5` below).
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
- **Tests:** `npm test --prefix server` runs `node --test test/*.test.js`. All 30 tests passed as of commit `90d19d0`. GitHub Actions workflow: `.github/workflows/server-tests.yml`.
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

### `KrisWemet/rusticretreat-crm#4`: booking total with GST, security patch (merged as `368921b`, deployed)

- **Package:** the New/Edit Booking form's Package is now a dropdown of active packages. A retired or hand-typed name on an older booking stays selectable.
- **Total:** choosing a package or check-in date fills the total with that year's price plus 5% GST (3-Day 2027 → $6,825; 3-Day 2028 → $7,875; 5-Day 2028 → $8,925).
  - A total staff typed themselves is never overwritten.
  - If a total differs from the package price with GST, an amber note says so and offers the right figure in one click.
  - Saving is never blocked, so totals that include add-ons still work.
- **Security:** a lockfile-only update to express 4.22.3 and qs 6.16.0, which fixes a high-severity denial-of-service in `qs`.
- **Deploy:** succeeded on Railway at 15:20 UTC on 26 Sep 2026.

### `KrisWemet/rusticretreat-crm#5`: payment percentages and custom payment plans (merged as `91ef236`, deployed)

- **Add Invoice → Payment dropdown:** Deposit (25%), Second payment (25%), Final balance (50%), Half of the deposit (12.5%), or Custom amount.
  - Once a couple is picked, the choice fills the amount from their booking total, and the description and due date from the agreement's schedule.
  - Typing an amount switches the dropdown back to Custom.
- **Auto Schedule → editable plan:** the standard three payments appear as editable rows before saving.
  - **Split (✂):** turns a payment into two halves, the second due 14 days later (you can change the date). This covers a deposit paid in two parts.
  - **Other edits:** any description, amount or date can be changed, and rows can be removed or added.
  - **Total check:** **Create Schedule** only works once the rows add up to what's still owed. The server checks this too (`normaliseCustomSchedule` in `server/services/paymentSchedule.js`).
  - **Already paid:** paid invoices are always kept, so the new plan covers only the remainder. The form says how much has been paid.
  - **Safe replacement:** unpaid invoices are replaced in one transaction, so a refused plan changes nothing.
- **Server:** a new `POST /api/invoices/schedule-preview` returns the standard schedule without saving. `POST /api/invoices/schedule/:coupleId` now takes an optional `items` list.
- **Display:** invoice amounts now always show two decimals.
- **Deploy:** succeeded on Railway at 15:38 UTC on 26 Sep 2026.

### `KrisWemet/rusticretreat-crm#6`: dropdowns and quick picks across admin forms (merged as `90d19d0`, deployed)

- **Clients (add and edit):**
  - **Venue Package** is a list of active packages.
  - New **How they heard about us** list, with the same choices as the public enquiry form. It's saved as `referral_source`, so couples added by hand count in the Analytics referral chart. The client page shows it as "Heard about us".
- **Tasks:**
  - **Title** suggests 12 common follow-ups and still accepts anything typed.
  - **Due in** shortcuts, from today to 1 month.
  - **Assigned To** is a list of staff, from a new `GET /api/auth/staff` that returns only ids and names.
- **Bookings:**
  - **Ceremony / Reception** suggest the venue's spaces (Forest Clearing, Poplar Grove, Meadow, Clear-Top Gazebo) plus earlier entries, and still accept anything typed.
  - **Add-ons:** "+ Add from the add-on list" adds an item with its price to the add-ons text.
- **Messages:** a **Quick reply** list that fills an editable message with the couple's first names (check in, after a tour, proposal ready, contract ready, payment reminder, payment received, day-of timeline, final guest count).
- **Where to edit the lists:** they all live in `client/src/utils/options.js`. A saved value that isn't in a list still shows, so older records are never blanked.
- **Checked end to end:** a browser test on a local copy with a fresh database covered enquiry, couple, booking, split payment plan, task, message and Analytics, plus every admin and portal page. It found no errors.
- **Deploy:** succeeded on Railway at 15:54 UTC on 26 Sep 2026. The daily backup ran right after.

---

## Open items

1. **Shannon & Chris booking shows $6,439.**
   - **Cause:** that number was typed by hand into the New Booking form on 25 Sep 2026 (Railway log `POST /api/bookings`). No code changed it.
   - **Correct total:** **$6,825**, which is $6,500 plus $325 GST.
   - **Fix (for the owner, not done yet):** Bookings → Edit. The amber note offers **use $6,825.00**; click it, then Update Booking. Then on Payments, choose Auto Schedule for the couple and Create Schedule. Check-in is 23 Jul 2027, so the invoices should be:

     | Payment | Amount | Due |
     |---|---|---|
     | Deposit (25%) | $1,706.25 | now |
     | Second payment (25%) | $1,706.25 | 24 Jan 2027 (180 days before) |
     | Final payment (50%) | $3,412.50 | 24 Apr 2027 (90 days before) |
   - **Prevention:** now built and live (`KrisWemet/rusticretreat-crm#4`).
2. **`KrisWemet/rusticretreat-crm#2` deploy: verified.** It deployed successfully at 00:58 UTC on 26 Sep 2026.
   - **Log results:** "Set 2028 prices on 2 package(s)" and "Removed 4 demo couple(s) and 6 demo task(s)". No migration errors.
   - **No "Deactivated 2-Day" line:** no *active* 2-Day package was found, so it was probably already switched off. Worth a glance on the Packages page.
3. **Later, optional:**
   - retire repo A (the Vercel project and Supabase project `aztaffrywreshzyzraiz`, including its `legacy_backup` schema)
   - turn on Supabase leaked-password protection
   - add camping tracking
   - confirm the cancellation wording in the agreement
   - **dependency upgrades that need a major version:**
     - nodemailer 8 → 10: only the backup email path behind Resend, and the affected options aren't used
     - react-router 6 → 7: moderate
   - **garbled URLs:** a URL with invalid encoding (bot scans for `.env` files) gets a 500 from the static file handler instead of a 400. It's harmless because nothing is exposed.

---

## Rules to keep following

- **Never run `reset-data.js` on the live database.** It holds real couples.
- **Back up before risky changes:** download a backup from Railway (service → Volume → Backups) first.
- **Secrets** go straight into Railway or GitHub settings, never into chat. Never put a Supabase service-role key in a `VITE_` variable.
- **Client portal** stays on hold until the owner says otherwise.
- **The CRM access gate** stays off (`CRM_PUBLIC=1`).
- **Totals** entered in the CRM should include 5% GST.
- **Git:** work on a `claude/...` branch, open a PR, and the owner merges it. Railway deploys from `claude/wedding-crm-esign-integration-coau0z`.
