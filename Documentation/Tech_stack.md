# Technical Stack and Architecture: Rustic Retreat CRM

**Document Version:** 1.1
**Date:** January 20, 2026
**Author:** Manus AI
**Goal:** To define the technology stack and architectural patterns for the Rustic Retreat CRM, ensuring scalability, security, and developer efficiency.

***

## 1. Technology Stack Summary

The CRM will be built using a modern, full-stack JavaScript architecture, leveraging a "Backend-as-a-Service" approach for rapid development and scalability.

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React, TypeScript, Next.js/Vite, Tailwind CSS, shadcn/ui | User Interface, Routing, State Management, Component Library. |
| **Backend/Database** | **Supabase** (PostgreSQL) | Database, Authentication, Storage, Realtime, Edge Functions (Serverless). |
| **State Management** | TanStack Query (React Query) | Data fetching, caching, synchronization, and state management. |
| **Form Management** | React Hook Form, Zod | Form validation and state handling. |
| **Communication** | **Twilio** (SMS), **Resend** (Email) | Automated and manual client communication. |
| **Payments** | **Stripe** | Payment processing and webhook handling. |

## 2. Architectural Diagram

The architecture follows a standard client-server model, heavily utilizing Supabase services to minimize custom server-side code.

```mermaid
graph TD
    A[Admin/Client/Family Browser] -->|HTTPS| B(Frontend Application - React/TS);
    B -->|API Calls| C(Supabase API Gateway);
    C --> D(Supabase Services);
    D --> E(PostgreSQL Database);
    D --> F(Supabase Auth);
    D --> G(Supabase Storage);
    D --> H(Supabase Edge Functions);
    H --> I(Twilio API);
    H --> J(Resend API);
    H --> K(Stripe API);
    E --> L(pg_cron - Workflow Scheduler);
    L --> H;
    K -->|Webhooks| H;
```

## 3. Key Architectural Decisions

### 3.1. Supabase as the Core Backend

*   **Database:** PostgreSQL provides robust relational capabilities, essential for complex data like bookings, payments, and guests.
*   **Authentication:** Supabase Auth will handle user sign-up, login, and session management for all three roles (Admin, Client, Family).
*   **Security (CRITICAL):** **Row Level Security (RLS)** will be enabled on all tables. This is the primary mechanism for ensuring clients can only access their own booking data and staff can only access operational data.
*   **Edge Functions:** Used for secure, server-side logic that requires API keys (e.g., Twilio, Stripe, Resend) or scheduled execution (Workflows).

### 3.2. Frontend Framework

*   **React/TypeScript:** Provides a modern, type-safe, and component-based development environment.
*   **TanStack Query:** Essential for managing the complex asynchronous state (bookings, payments, checklists) and ensuring a fast, responsive user experience.
*   **shadcn/ui:** Provides a set of accessible, composable UI components built on Tailwind CSS, accelerating development of the Admin and Client portals.

### 3.3. Communication Integration

*   **Twilio (SMS):** Integrated via a Supabase Edge Function to securely send automated and manual SMS messages. This ensures the Twilio API key is never exposed client-side.
*   **Resend (Email):** Integrated via a Supabase Edge Function for high-deliverability email communication (contracts, reminders).

### 3.4. Workflow Execution

*   **pg_cron:** The PostgreSQL extension will be used to schedule a daily cron job that calls a specific Supabase Edge Function (`execute-workflows`).
*   **Workflow Executor:** This Edge Function will query the `automated_workflows` table, execute any due tasks (e.g., send payment reminders), and update the workflow status. This decouples the scheduling from the application logic.

## 4. Data Model Highlights

The data model is designed to support the complex validation and upsell tracking required by Rustic Retreat.

| Entity | Key Fields & Relationships | Notes |
| :--- | :--- | :--- |
| `users` | `id` (FK to `auth.users`), `role` (ENUM: 'admin', 'client', 'family') | Enforces RLS and role-based access. |
| `bookings` | `client_user_id`, `package_type`, `start_date`, `end_date`, `rv_count_included`, `non_refundable_deposit_amount` | Core booking record. Includes fields for package-specific rules. |
| `guests` | `booking_id`, `guest_type` (ENUM: 'reception', 'camping', 'rv', 'tent'), `arrival_date`, `departure_date` | Detailed tracking for capacity and upsell calculation. |
| `payments` | `booking_id`, `payment_type`, `amount`, `due_date`, `status` | Tracks scheduled and paid amounts. |
| **`upsells` (NEW)** | `booking_id`, `type` (ENUM of all upsells), `quantity`, `unit_price` | Tracks all non-package revenue items (RV nights, pet fee, etc.). |
| `contracts` | `booking_id`, `status`, `signed_pdf_url`, `client_ip_address` | Legal record, ensures non-repudiation. |
| `client_checklist` (NEW) | `booking_id`, `task_name`, `due_date`, `is_complete` | Client-facing planning tool. |
| `automated_workflows` | `booking_id`, `workflow_type`, `scheduled_for`, `status` | Tracks all automated communication tasks. |

***

## 5. Development Environment Setup

The project will use the following standard setup:

1.  **Project Initialization:** `npm install` for dependencies.
2.  **Supabase CLI:** Used for local development, migration management (`supabase db push`), and deployment.
3.  **Environment Variables:** Securely store API keys and service URLs in `.env.local` and production environment variables.

| Variable | Usage | Security |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Client-side Supabase connection. | Low risk (Anon Key is public). |
| `SUPABASE_SERVICE_KEY` | Server-side/Edge Function access. | **HIGH RISK - MUST BE SECRET.** |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | Twilio API credentials. | **HIGH RISK - MUST BE SECRET.** |
| `STRIPE_SECRET_KEY`, `RESEND_API_KEY` | Payment/Email API credentials. | **HIGH RISK - MUST BE SECRET.** |

All high-risk secrets **MUST** be stored as environment variables accessible only to the Supabase Edge Functions and not exposed in the client-side code.
