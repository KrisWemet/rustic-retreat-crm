# Rustic Retreat package rules

This document is the source of truth for **new CRM bookings**. The January 2026 PRD and implementation plan describe an earlier offer and should not be used to calculate new quotes.

## Confirmed public terms

| Season | Classic 3-Day Weekend | Full 5-Day Experience |
| --- | ---: | ---: |
| 2026 | $4,500 CAD | $5,500 CAD |
| 2027 | $6,500 CAD | $7,500 CAD |

GST is additional. The 2-day package in the old CRM plan is not offered for new bookings. Existing bookings keep their contract terms, even if they were made under a previous offer.

Every package includes exclusive property use and camping for up to 60 guests. Eight RVs and 12 tents are included, and the property can accommodate at most 15 RVs. The website does not state a hard tent-unit cap. Fees for units above the included allowances come from the signed contract, so the CRM must not guess a price. Camping guests are not charged a nightly tent or RV fee by default.

The 3-day weekend runs Friday through Sunday. The public site describes this as three calendar days / 60 hours. Package prices are tied to the event season, and the agreed terms are copied into the booking at creation. A future season must get an approved price before its booking can be created.

The 5-day package can run Wednesday–Sunday, Thursday–Monday, or Friday–Tuesday, inclusive. Which window is possible depends on adjacent weddings and the required reset day. `end_date` is the last occupied calendar day. Reception includes 80 guests, permits up to 100 with overage fees for guests 81–100, and rejects bookings above 100. The CRM requires an agreed per-guest overage rate when booking more than 80 guests and calculates the total from that rate.

Approved prices and allowances are versioned in `booking_package_catalog`. The booking RPC accepts only a snapshot that exactly matches one of those rows, so changing the form payload cannot change a quoted price. `src/lib/packageCatalog.ts` mirrors those rows for the interface. New seasons require a reviewed catalog migration and a matching interface update.

## Financial details still needed

- Confirm whether reception overage uses one fixed amount per guest. Until then, the CRM requires an explicit rate from the signed contract for each booking above 80 guests.
- The old CRM plan lists pet, firewood, fireworks, and damage-deposit prices. Confirm these against current contracts before automating invoices.

## Evidence

- Website `public/packages.txt`, `public/faqs.txt`, `src/pages/Booking2026.tsx`, and `src/pages/Booking2027.tsx` in the `rustic-retreat-weddings` project.
- CRM `Documentation/PRD.md` and `Documentation/Implementation_plan.md` are historical planning documents.
