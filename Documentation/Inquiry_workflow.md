# Inquiry-to-booking workflow

The **Leads** board shows only sales stages: New Lead → First Contact → Qualified → Tour Scheduled → Tour Completed → Contract Sent → Contract Signed. Move a card to the next stage after the actual action. Open a card to record both partners, preferred contact method, estimated guests, tour request and appointment, tour outcome, last contact, next follow-up, and lost reason. The Follow-up due view shows open leads whose follow-up time has passed. Lost and booked records have separate views. A confirmed booking is created through **Convert to Booking**; use the Bookings area for wedding preparation. Dragging a card does not reserve a date.

The wedding date estimate is free text. Keep entries such as “Summer 2027” as written until the couple picks a specific date. A tour appointment and a wedding booking are distinct dates.

## Website intake setup

The public contact and 2026/2027 booking-request forms still submit to Formspree. After Formspree succeeds, each form sends a copy to the website’s same-origin `/api/crm-inquiry` Vercel Function. That server-side function holds the CRM database key and calls `import_website_inquiry`; no secret goes into the browser. Formspree remains the fallback notification if the CRM is unavailable.

Each submission has an ID for idempotent retries. Repeated contact with the same email and date updates an open lead and preserves its new message. A later booking questionnaire from that email updates the open lead with the more specific wedding date and requested package details. Closed or booked leads are not overwritten. The database limits requests by IP and email; the API checks the origin and a honeypot field.

1. Apply all timestamped CRM migrations in order, including the permissions, finance, and integration guards. Resolve any historical booking overlaps before the calendar constraint.
2. In the **website’s Vercel project**, set server-side `CRM_SUPABASE_URL` and `CRM_SUPABASE_SERVICE_ROLE_KEY` for the CRM Supabase project. They may differ from the website chat-analytics Supabase values. Never add the service-role key to a `VITE_` variable.
3. Deploy the website. Submit test contact and booking-request forms with a flexible date. Confirm each Formspree notification and one CRM lead containing the names, original date text, preferred contact, guest estimate, inquiry type, and marketing source. Retry the same submission ID to confirm no duplicate. Set a follow-up time in the CRM and verify it appears in Follow-up due.

A booking questionnaire is still only a **request**. It does not create a confirmed wedding or inventory hold. Review the request, verify availability and contract terms, then convert the lead through the CRM booking flow.
