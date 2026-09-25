# Wedding workspace and attention dashboard

Each confirmed booking opens from **Bookings** into a working record for the venue team. The overview reads the actual booked dates, package snapshot, reception/camping/RV counts, and any recorded reception overage. It never substitutes example wedding data. Historical bookings without a terms snapshot say to check the original contract.

The workspace records contract sent/signed dates and a reference, camping arrival notes, planning decisions, setup/readiness/checkout owners, and operations notes. Planning and operations tasks have an assignee, optional due time, and completion state. Payment items record a label, due date, amount due, and paid amount derived from individual receipts. The activity feed records changes, the signed-in actor, and manual notes or communication. Admins manage these tables; couples and assigned staff/family use limited portal functions described in [Permissions](Permissions.md).

The dashboard shows new inquiries without a contact date, tours in the next 14 days, holds expiring within 48 hours, unpaid payment items past due, overdue tasks, and missing details for the next upcoming wedding. Counts represent records actually entered in the CRM. A missing payment schedule is flagged separately; an empty schedule does not mean the couple owes nothing.

## Scope and validation

Apply `20260923050000_wedding_workspace.sql` after the step 1–3 migrations. The complete migration chain was tested in disposable PostgreSQL 16, including booking validation, hold conversion, website intake, and payment bounds. The app build, full ESLint check, and unit tests pass.

This is a manual working record, not an accounting system or contract-signing service. Enter the agreed schedule from the signed contract, reconcile amounts against bank/e-transfer records, and use the contract to determine taxes and refunds. Step 5 adds the nightly camping register, property checklists, and a separate manual damage-deposit record; see [Operations workflow](Operations_workflow.md). Step 7 adds the signed-total record, individual receipts, optional charges, and manual reminder log; see [Financial reminders](Financial_reminders.md). Bank integration and automatic message delivery remain future work.
