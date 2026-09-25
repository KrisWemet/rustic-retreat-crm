export type CampUnit = {
  id: string
  booking_id: string
  group_name: string
  kind: 'rv' | 'tent'
  unit_size_ft: number | null
  occupants: number
  arrival_on: string
  departure_on: string
  contact_name: string | null
  contact_phone: string | null
  site_label: string | null
  notes: string | null
}

export type NightlyCapacity = {
  date: string
  campers: number
  rvs: number
  tents: number
  extraRvs: number
  extraTents: number
}

export const CAMPING_GUEST_LIMIT = 60
export const INCLUDED_RVS = 8
export const MAX_RVS = 15
export const INCLUDED_TENTS = 12

export function nightlyCapacity(start: string, end: string, units: CampUnit[]): NightlyCapacity[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start >= end) return []
  const rows: NightlyCapacity[] = []
  const date = new Date(`${start}T00:00:00Z`)
  const last = new Date(`${end}T00:00:00Z`)
  if (Number.isNaN(date.getTime()) || Number.isNaN(last.getTime())) return []
  while (date < last) {
    const day = date.toISOString().slice(0, 10)
    const present = units.filter(unit => unit.arrival_on <= day && unit.departure_on > day)
    const rvs = present.filter(unit => unit.kind === 'rv').length
    const tents = present.filter(unit => unit.kind === 'tent').length
    rows.push({
      date: day,
      campers: present.reduce((sum, unit) => sum + unit.occupants, 0),
      rvs,
      tents,
      extraRvs: Math.max(0, rvs - INCLUDED_RVS),
      extraTents: Math.max(0, tents - INCLUDED_TENTS),
    })
    date.setUTCDate(date.getUTCDate() + 1)
  }
  return rows
}

export function validateCampUnit(unit: Pick<CampUnit, 'arrival_on' | 'departure_on' | 'occupants' | 'kind'>, start: string, end: string, existing: CampUnit[]): string | null {
  if (unit.arrival_on < start || unit.departure_on > end || unit.arrival_on >= unit.departure_on) return 'Arrival and checkout must fall within the booked dates, with at least one night.'
  if (!Number.isInteger(unit.occupants) || unit.occupants < 1 || unit.occupants > CAMPING_GUEST_LIMIT) return 'Enter 1–60 occupants.'
  const proposed = nightlyCapacity(start, end, [...existing, { ...unit, id: 'preview' } as CampUnit])
  if (proposed.some(day => day.campers > CAMPING_GUEST_LIMIT)) return 'Nightly camping would exceed 60 guests.'
  if (proposed.some(day => day.rvs > MAX_RVS)) return 'Nightly RV count would exceed 15.'
  return null
}
