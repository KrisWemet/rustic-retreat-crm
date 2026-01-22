export type PackageType = 'two_day' | 'three_day' | 'five_day'

export type BookingInput = {
  package: PackageType
  start_date: string // ISO date
  end_date: string // ISO date (computed or selected)
  guest_reception_count: number
  guest_camping_count: number
}

export type ExistingBooking = {
  id: string
  start_date: string
  end_date: string
}

const MAX_RECEPTION = 80
const MAX_CAMPING = 60

function dayOfWeek(date: Date) {
  // 0 Sun, 1 Mon, 2 Tue, 3 Wed, 4 Thu, 5 Fri, 6 Sat
  return date.getUTCDay()
}

export function computeEndDate(pkg: PackageType, startISO: string): string {
  const d = new Date(startISO)
  const end = new Date(d)
  if (pkg === 'two_day') end.setUTCDate(d.getUTCDate() + 2) // Tue-Thu windows (2 nights)
  if (pkg === 'three_day') end.setUTCDate(d.getUTCDate() + 2) // Fri-Sun (2 nights)
  if (pkg === 'five_day') end.setUTCDate(d.getUTCDate() + 5) // 5 nights
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
    // Wed-Mon or Thu-Tue
    const validStart = sD === 3 || sD === 4 // Wed or Thu
    const expectedEnd = computeEndDate(pkg, startISO)
    const endD = dayOfWeek(new Date(expectedEnd))
    const validEnd = (sD === 3 && endD === 1) || (sD === 4 && endD === 2) // Mon or Tue accordingly
    if (!validStart || expectedEnd !== endISO || !validEnd) return '5-day must be Wed-Mon or Thu-Tue.'
  }

  return null
}

export function validateCapacity(reception: number, camping: number): string | null {
  if (reception > MAX_RECEPTION) return `Reception guest limit is ${MAX_RECEPTION}.`
  if (camping > MAX_CAMPING) return `Camping guest limit is ${MAX_CAMPING}.`
  return null
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart <= bEnd && bStart <= aEnd
}

export function validateResetRule(startISO: string, endISO: string, existing: ExistingBooking[]): string | null {
  const s = new Date(startISO)
  const e = new Date(endISO)
  // enforce at least 1-day reset: neighbor bookings must be at least 1 day away
  for (const b of existing) {
    const bs = new Date(b.start_date)
    const be = new Date(b.end_date)
    // expand the occupied range by 1 day on both ends for reset buffer
    const bePlus1 = new Date(be)
    bePlus1.setUTCDate(bePlus1.getUTCDate() + 1)
    const bsMinus1 = new Date(bs)
    bsMinus1.setUTCDate(bsMinus1.getUTCDate() - 1)
    if (overlaps(s, e, bsMinus1, bePlus1)) {
      return 'Insufficient reset time between bookings (min 1 full day).'
    }
  }
  return null
}

