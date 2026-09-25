export type PackageType = 'two_day' | 'three_day' | 'five_day'

export type BookingInput = {
  package: PackageType
  start_date: string // ISO date
  end_date: string // ISO date (computed or selected)
  guest_reception_count: number
  guest_camping_count: number
  rv_count: number
}

export type ExistingBooking = {
  id: string
  start_date: string
  end_date: string
  kind?: 'booking' | 'hold' | 'blackout'
  inquiry_id?: string | null
}

const MAX_RECEPTION = 100
const MAX_CAMPING = 60
const MAX_RVS = 15
export const INCLUDED_RECEPTION = 80

function dayOfWeek(date: Date) {
  // 0 Sun, 1 Mon, 2 Tue, 3 Wed, 4 Thu, 5 Fri, 6 Sat
  return date.getUTCDay()
}

export function computeEndDate(pkg: PackageType, startISO: string): string {
  const d = new Date(startISO)
  const end = new Date(d)
  if (pkg === 'two_day') end.setUTCDate(d.getUTCDate() + 2) // Tue-Thu windows (2 nights)
  if (pkg === 'three_day') end.setUTCDate(d.getUTCDate() + 2) // Fri-Sun (2 nights)
  if (pkg === 'five_day') end.setUTCDate(d.getUTCDate() + 4) // Wed-Sun, Thu-Mon, or Fri-Tue
  return end.toISOString().slice(0, 10)
}

export function validatePackageWindow(pkg: PackageType, startISO: string, endISO: string): string | null {
  const s = new Date(startISO)
  const sD = dayOfWeek(s)

  if (pkg === 'two_day') {
    // Tue-Thu window (start Tue or Wed; end two days later)
    const validStart = sD === 2 || sD === 3 // Tue or Wed
    const expectedEnd = computeEndDate(pkg, startISO)
    if (!validStart || expectedEnd !== endISO) return '2-day must start Tue/Wed and end two days later (Tue-Thu window).'
  } else if (pkg === 'three_day') {
    // Fri-Sun (start Fri, end Sun)
    const validStart = sD === 5
    const expectedEnd = computeEndDate(pkg, startISO)
    const endIsSun = dayOfWeek(new Date(expectedEnd)) === 0
    if (!validStart || expectedEnd !== endISO || !endIsSun) return '3-day must be Fri-Sun.'
  } else if (pkg === 'five_day') {
    // Three five-calendar-day windows around a Saturday wedding.
    const validStart = sD === 3 || sD === 4 || sD === 5
    const expectedEnd = computeEndDate(pkg, startISO)
    const endD = dayOfWeek(new Date(expectedEnd))
    const validEnd = (sD === 3 && endD === 0) || (sD === 4 && endD === 1) || (sD === 5 && endD === 2)
    if (!validStart || expectedEnd !== endISO || !validEnd) return '5-day must be Wed-Sun, Thu-Mon, or Fri-Tue.'
  }

  return null
}

export function validateCapacity(reception: number, camping: number): string | null {
  if (!Number.isInteger(reception) || reception < 0 || !Number.isInteger(camping) || camping < 0) return 'Guest counts must be non-negative whole numbers.'
  if (reception > MAX_RECEPTION) return `Reception guest limit is ${MAX_RECEPTION}.`
  if (camping > MAX_CAMPING) return `Camping guest limit is ${MAX_CAMPING}.`
  return null
}

export function validateRvCount(count: number): string | null {
  if (!Number.isInteger(count) || count < 0) return 'RV count must be a non-negative whole number.'
  if (count > MAX_RVS) return `RV limit is ${MAX_RVS}.`
  return null
}

export function receptionOverageTotalCents(reception: number, rateCents: number): number {
  return Math.max(0, reception - INCLUDED_RECEPTION) * rateCents
}

export function validateReceptionOverageRate(reception: number, rateCents: number): string | null {
  if (reception <= INCLUDED_RECEPTION) return null
  if (!Number.isInteger(rateCents) || rateCents <= 0) return 'Enter the agreed fee per guest above 80.'
  return null
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart <= bEnd && bStart <= aEnd
}

export function validateResetRule(startISO: string, endISO: string, existing: ExistingBooking[], ignoredHoldInquiryId?: string): string | null {
  const s = new Date(startISO)
  const e = new Date(endISO)
  const candidateResetEnd = new Date(e)
  candidateResetEnd.setUTCDate(e.getUTCDate() + 1)
  for (const b of existing) {
    if (ignoredHoldInquiryId && b.kind === 'hold' && b.inquiry_id === ignoredHoldInquiryId) continue
    const bs = new Date(b.start_date)
    const be = new Date(b.end_date)
    const existingResetEnd = new Date(be)
    if (b.kind !== 'blackout') existingResetEnd.setUTCDate(be.getUTCDate() + 1)
    if (overlaps(s, candidateResetEnd, bs, existingResetEnd)) {
      return 'Dates conflict with a booking, hold, blackout, or reset day.'
    }
  }
  return null
}

export function getFiveDayWindowOptions(startISO: string, existing: ExistingBooking[], ignoredHoldInquiryId?: string) {
  const selected = new Date(`${startISO}T00:00:00Z`)
  if (Number.isNaN(selected.getTime())) return []
  const saturday = new Date(selected)
  saturday.setUTCDate(selected.getUTCDate() + ((6 - selected.getUTCDay() + 7) % 7))

  return [
    { label: 'Wed–Sun', daysBeforeSaturday: 3 },
    { label: 'Thu–Mon', daysBeforeSaturday: 2 },
    { label: 'Fri–Tue', daysBeforeSaturday: 1 },
  ].map(({ label, daysBeforeSaturday }) => {
    const start = new Date(saturday)
    start.setUTCDate(saturday.getUTCDate() - daysBeforeSaturday)
    const startDate = start.toISOString().slice(0, 10)
    const endDate = computeEndDate('five_day', startDate)
    return {
      label,
      startDate,
      endDate,
      available: !validateResetRule(startDate, endDate, existing, ignoredHoldInquiryId),
    }
  })
}
