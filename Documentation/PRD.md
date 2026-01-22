# Product Requirements Document (PRD): Rustic Retreat CRM

**Document Version:** 1.1
**Date:** January 20, 2026
**Author:** Manus AI
**Goal:** To build a custom, all-in-one CRM and client planning portal for Rustic Retreat, a single-inventory, off-grid wedding venue, ensuring operational efficiency, legal compliance, and an enhanced client experience.

***

## 1. Business Goals & Context

The primary goal is to replace manual processes and generic software with a single, purpose-built tool that enforces Rustic Retreat's unique business rules. The CRM must manage the entire client lifecycle from initial inquiry to post-event follow-up.

**Key Operational Reality:** Rustic Retreat books **one event at a time**. The CRM must function as a single-inventory management system.

## 2. User Roles & Permissions

The system must support three distinct user roles, with permissions enforced via Row Level Security (RLS) [1].

| Role | Primary Responsibilities | Key Access/Permissions |
| :--- | :--- | :--- |
| **Admin (Shannon)** | Full operational management, financial oversight, system configuration, client communication. | Full CRUD access to all data (Inquiries, Bookings, Payments, Settings). |
| **Client (Couple)** | Event planning, guest management, contract signing, document upload, payment tracking. | Read/Write access ONLY to their specific Booking, Guests, Vendors, Documents, and Payments. |
| **Family/Staff** | Pre- and post-event operational tasks, maintenance, and setup. | Read-only access to relevant Booking details (dates, package). Read/Write access to internal Checklists. **No access to financial or sensitive client data.** |

## 3. Core Feature Requirements

### 3.1. Inquiry & Pipeline Management (Phase 2)

*   **Capture:** Must capture Name, Email, Phone, Estimated Guest Count (Reception/Camping), RV Count Request, and Source.
*   **Pipeline Stages:** Must support the following custom stages: Inquiry → Tour/Call scheduled → Approved → Contract sent → Contract signed → Booking confirmed → Pre-event checklist → Event week → Post-event inspection.
*   **Lead Scoring:** Basic logic to flag high-priority leads (e.g., event date within 12 months).

### 3.2. Booking & Calendar Management (Phase 3)

*   **Single-Inventory Calendar:** A visual calendar that clearly shows **Confirmed Bookings**, **Pending Holds**, and **Admin Blackout** dates.
*   **Booking Validation (CRITICAL):** The system must prevent double-booking and enforce the following package rules:

| Package Type | Duration | Fixed Rules | Guest Limits |
| :--- | :--- | :--- | :--- |
| **2-Day** | 2 nights | Must start on a **Tuesday** or **Wednesday**. Must not conflict with 3- or 5-day bookings. | Max 80 Reception / Max 60 Camping |
| **3-Day** | 3 nights | Must be **Friday-Sunday**. | Max 80 Reception / Max 60 Camping |
| **5-Day** | 5 nights | Must be **Wednesday-Monday** OR **Thursday-Tuesday**. | Max 80 Reception / Max 60 Camping |
| **Reset Time** | N/A | **Minimum 1-day (24 hours) reset** between all bookings. Admin warning if less than 3 days. | N/A |
| **Prep/Teardown** | N/A | For 5-Day bookings, the first two days (Wed/Thu or Thu/Fri) and last two days (Sun/Mon or Mon/Tue) are considered prep/teardown days. **Max 20 guests** allowed on-site during these days. | N/A |

*   **Capacity Enforcement:** Hard validation to prevent exceeding **80 Reception Guests** and **60 Camping Guests**.

### 3.3. Financial Management (Phase 4)

*   **Payment Schedule:** Auto-generate a schedule of 3 payments (Deposit, Payment 2, Final) based on the event date and the non-refundable deposit amount.
*   **Upsell Tracking:** Dedicated module to track and invoice all upsells, which are added to the Final Payment:
    *   RV Night Fee ($25/RV/Night)
    *   Tent Night Fee ($15/Tent/Night)
    *   Propane Refill ($35)
    *   Pet Fee ($50/stay)
    *   Firewood Shed Refill ($150)
    *   Firewood Wheelbarrow Refill ($20)
    *   Fireworks Setup Fee ($250)
*   **Cancellation Policy (CRITICAL):** Implement the following tiered refund logic:
    *   **> 90 days out:** Full refund of payments made, minus the non-refundable deposit.
    *   **60-90 days out:** 50% refund of the balance paid above the non-refundable deposit.
    *   **< 60 days out:** No refund of any payments made.
*   **Damage Deposit:** Dedicated workflow for the **$500 Damage Deposit**, due on the day of check-in, with a post-event inspection and refund/deduction logging.

### 3.4. Client Portal & Planning Tool (Phase 5)

The client portal must serve as the couple's primary planning tool.

*   **Client Planning Checklist:** A client-facing checklist (separate from the internal staff checklist) where the couple can track their planning tasks (e.g., "Book Florist," "Send Invites").
*   **Detailed Guest Tracking:** Clients must be able to input:
    *   **RV/Tent Guests:** Including RV size, arrival date, and departure date for each unit.
    *   **Guest Details:** RSVP status, meal choice (optional future feature).
*   **Contract & Documents:** View/download signed contract and upload vendor contracts, timelines, and floor plans.

### 3.5. Communication & Automation (Phase 7)

*   **Twilio SMS Priority:** All automated reminders must prioritize **Twilio SMS** as the primary communication channel, with email as a fallback.
*   **Automated Workflows:** Must include:
    *   Payment reminders (90-day, 60-day).
    *   **7-Day Pre-Arrival Reminder (CRITICAL):** Must include check-in instructions and a reminder for the **$500 Damage Deposit**.
    *   Post-event review request.

## 4. Reporting Requirements (Phase 8)

*   **Financial Reports:** Revenue by month/year, GST collected, Outstanding Receivables, and a full transaction export for accounting.
*   **Operational Reports:** Lead conversion rate by source, RV Upsell Count, Damage Deposit Status timeline.

***

## 5. Next Steps

This PRD, along with the accompanying Technical Stack and Implementation Plan documents, provides the complete scope for the development team.

| Document | Purpose |
| :--- | :--- |
| `rustic_retreat_crm_prd.md` | **What** to build (Features & Rules) |
| `rustic_retreat_crm_tech_stack.md` | **How** to build it (Architecture & Tools) |
| `rustic_retreat_crm_implementation_plan.md` | **When** to build it (Phase-by-Phase Guide) |

[1]: Row Level Security is a database feature that restricts which rows a user can access based on their role or other conditions. In this case, it is essential for separating Admin, Client, and Family data access.
