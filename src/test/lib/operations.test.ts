import { nightlyCapacity, validateCampUnit, type CampUnit } from '@/lib/operations'

const nextDay = (day: string) => { const value = new Date(`${day}T00:00:00Z`); value.setUTCDate(value.getUTCDate() + 1); return value.toISOString().slice(0, 10) }
const unit = (id: string, kind: 'rv' | 'tent', occupants: number, arrival_on: string, departure_on = nextDay(arrival_on)): CampUnit => ({
  id, booking_id: 'booking', group_name: id, kind, unit_size_ft: null, occupants,
  arrival_on, departure_on, contact_name: null, contact_phone: null, site_label: null, notes: null,
})

describe('nightly camping register', () => {
  it('counts arrivals and departures on inclusive calendar days', () => {
    const rows = nightlyCapacity('2027-06-11', '2027-06-13', [
      unit('family', 'tent', 4, '2027-06-11', '2027-06-13'),
      unit('rv', 'rv', 2, '2027-06-12', '2027-06-13'),
    ])
    expect(rows.map(row => [row.campers, row.rvs, row.tents])).toEqual([[4, 0, 1], [6, 1, 1]])
  })

  it('shows included-unit overages without calculating an unapproved fee', () => {
    const units = Array.from({ length: 9 }, (_, i) => unit(`rv-${i}`, 'rv', 1, '2027-06-11'))
    const [row] = nightlyCapacity('2027-06-11', '2027-06-12', units)
    expect(row.extraRvs).toBe(1)
    expect(row.campers).toBe(9)
  })

  it('rejects nights over the guest or RV hard caps', () => {
    const manyGuests = [unit('large', 'tent', 59, '2027-06-11')]
    expect(validateCampUnit(unit('small', 'tent', 2, '2027-06-11'), '2027-06-11', '2027-06-13', manyGuests)).toMatch(/60 guests/)
    const rvs = Array.from({ length: 15 }, (_, i) => unit(`rv-${i}`, 'rv', 1, '2027-06-11'))
    expect(validateCampUnit(unit('extra', 'rv', 1, '2027-06-11'), '2027-06-11', '2027-06-13', rvs)).toMatch(/15/)
    expect(validateCampUnit(unit('outside', 'tent', 1, '2027-06-14'), '2027-06-11', '2027-06-13', [])).toMatch(/booked dates/)
  })
})
