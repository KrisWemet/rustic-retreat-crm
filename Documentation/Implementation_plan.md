# Rustic Retreat CRM - Phase-by-Phase Implementation Plan

**Document Version:** 1.2 (Updated with 5-Day Package Rules and Upsell Logic)
**Date:** January 20, 2026
**Author:** Manus AI
**Goal:** A detailed, iterative build guide for the Rustic Retreat CRM. Each phase is designed to be a self-contained, testable unit of work.

***

## 🏗️ PHASE 1: DATABASE & AUTHENTICATION

**Goal:** Supabase database fully set up, authentication working, and RLS policies defined for all three roles (Admin, Client, Family).

**Key Updates:**
*   Schema updated to include `upsells` table and detailed guest tracking fields.
*   RLS policies are critical for this phase.

## 🏗️ PHASE 2: INQUIRY & LEAD MANAGEMENT

**Goal:** Admin can manage leads through the custom Rustic Retreat pipeline stages.

**Key Updates:**
*   Pipeline stages updated to: Inquiry → Tour/Call scheduled → Approved → Contract sent → Contract signed → Booking confirmed → Pre-event checklist → Event week → Post-event inspection.

## 🏗️ PHASE 3: BOOKING CREATION & CALENDAR (CRITICAL VALIDATION)

**Goal:** Admin can create bookings with complex date and capacity validation, and view them on the calendar.

**Key Updates:**
*   **Booking Validation Logic (Phase 3.1):** Must implement the complex package rules:
    *   **2-Day:** Only Tue-Thu.
    *   **3-Day:** Always Fri-Sun.
    *   **5-Day:** Wed-Mon OR Thu-Tue.
    *   **Reset:** Minimum 1-day reset between all bookings (Admin warning for <3 days).
*   **Capacity Validation:** Hard limits enforced (80 Reception, 60 Camping).
*   **Prep/Teardown Guest Limit:** Logic to track and warn if guests exceed **20** during the 5-Day package's prep/teardown days.

## 🏗️ PHASE 4: PAYMENT TRACKING & CONTRACTS

**Goal:** Track payments, manage upsells, implement the tiered cancellation policy, and enable contract signing.

**Key Updates:**
*   **Upsell Management:** The `upsells` table is integrated. The **Add Upsell Modal** replaces the Add Surcharge Modal and includes all new upsell types (RV Night, Pet Fee, Fireworks Setup, etc.).
*   **Payment Calculation:** The `calculatePaymentSchedule` function must now:
    1.  Calculate the base package payments.
    2.  Calculate the **Final Upsell Payment** by summing all confirmed `upsells` and making it due with the final package payment.
*   **Cancellation Policy:** The `cancelBooking` function must implement the **tiered refund logic** (90+ days, 60-90 days, <60 days).

## 🏗️ PHASE 5: CLIENT PORTAL & PLANNING TOOL (EXPANDED)

**Goal:** Clients can log in, view their booking, manage guests, track RV/tents, and use the portal as their planning tool.

**Key Updates:**
*   **RV/Tent Tracking Module:** Clients must be able to input **RV Size** and **Arrival/Departure Dates** for each RV/Tent guest. This data is used to calculate the RV/Tent Night Upsell fee.
*   **NEW PHASE 5.6: Client Planning Checklist:** Implement a client-facing checklist feature (separate from the internal staff checklist) to help the couple manage their wedding planning tasks.

## 🏗️ PHASE 6: FAMILY DASHBOARD & CHECKLISTS

**Goal:** Family/Staff can view upcoming events and complete operational checklists.

**Status:** No major changes. The internal checklists (Pre-Event Setup, Post-Event Inspection) are crucial for the Damage Deposit workflow.

## 🏗️ PHASE 7: AUTOMATED WORKFLOWS & COMMUNICATIONS

**Goal:** Implement automated communication workflows, prioritizing Twilio SMS.

**Key Updates:**
*   **Twilio Priority:** Ensure `message-service.ts` prioritizes SMS for all short, time-sensitive reminders.
*   **Critical Workflow:** Add the **7-Day Pre-Arrival Reminder** workflow, which explicitly includes the check-in time and the **$500 Damage Deposit Reminder**.

## 🏗️ PHASE 8: POLISH, REPORTS & DEPLOYMENT

**Goal:** Finalize reporting, settings, and deploy the application.

**Key Updates:**
*   **Reporting:** Financial reports must include a breakdown of **Upsell Revenue** and a dedicated **Cancellation Audit Log** to track refund calculations.
*   **Settings:** Update the settings page to allow configuration of all new upsell unit prices and the non-refundable deposit percentage.

## 🔄 PHASE 1B: LIVE INTEGRATIONS

**Goal:** Replace mock services with live integrations.

**Status:** No changes. This remains the final step after the core application is stable.

***

## Testing Checkpoint: Phase 3 Validation

The following tests are **CRITICAL** to ensure the core business logic is correct:

| Test Case | Expected Outcome |
| :--- | :--- |
| **2-Day Booking (Valid)** | Start: Tuesday, End: Thursday. **Success.** |
| **2-Day Booking (Invalid)** | Start: Friday, End: Sunday. **Error: Package not allowed on weekends.** |
| **5-Day Booking (Valid)** | Start: Wednesday, End: Monday. **Success.** |
| **5-Day Booking (Invalid)** | Start: Friday, End: Tuesday. **Error: Invalid start/end day combination.** |
| **Reset Violation** | Book Fri-Sun, then try to book Mon-Wed. **Error: Insufficient reset time (must be 1 full day).** |
| **Prep/Teardown Guest Limit** | 5-Day booking, Admin enters 25 guests for prep day. **Warning: Exceeds 20-guest limit for prep/teardown days.** |
| **RV Upsell** | Client enters 20 RVs, 3 nights each. **System calculates 5 additional RVs * 3 nights * $25/RV/Night = $375 Upsell.** |
| **Cancellation** | Booking cancelled 75 days out. **System calculates 50% refund of balance above non-refundable deposit.** |

This plan is now fully aligned with the unique operational requirements of Rustic Retreat.
