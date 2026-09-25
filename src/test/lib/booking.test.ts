import { describe, it, expect } from 'vitest'
import { computeEndDate, getFiveDayWindowOptions, receptionOverageTotalCents, validateCapacity, validatePackageWindow, validateReceptionOverageRate, validateResetRule, validateRvCount } from '@/lib/validators/booking'

describe('booking validators', () => {
  it('validates 3-day Fri-Sun window', () => {
    const start = '2026-06-12' // Fri
    const end = computeEndDate('three_day', start)
    expect(validatePackageWindow('three_day', start, end)).toBeNull()
  })

  it('rejects 3-day starting on Tuesday', () => {
    const start = '2026-06-09' // Tue
    const end = computeEndDate('three_day', start)
    expect(validatePackageWindow('three_day', start, end)).toMatch(/3-day/)
  })

  it('accepts all three 5-day windows and rejects an extra day', () => {
    const start = '2026-06-10' // Wed
    const end = computeEndDate('five_day', start)
    expect(end).toBe('2026-06-14')
    expect(validatePackageWindow('five_day', start, end)).toBeNull()
    expect(validatePackageWindow('five_day', start, '2026-06-15')).toMatch(/5-day/)
    expect(validatePackageWindow('five_day', '2026-06-11', '2026-06-15')).toBeNull()
    expect(validatePackageWindow('five_day', '2026-06-12', '2026-06-16')).toBeNull()
    expect(validatePackageWindow('five_day', '2026-06-09', '2026-06-13')).toMatch(/5-day/)
  })

  it('rules out a 5-day option when a surrounding booking needs its reset day', () => {
    const previous = [{ id: 'previous', start_date: '2026-06-07', end_date: '2026-06-09' }]
    expect(validateResetRule('2026-06-10', '2026-06-14', previous)).toMatch(/reset/)
    expect(validateResetRule('2026-06-11', '2026-06-15', previous)).toBeNull()
    expect(getFiveDayWindowOptions('2026-06-12', previous)).toEqual([
      { label: 'Wed–Sun', startDate: '2026-06-10', endDate: '2026-06-14', available: false },
      { label: 'Thu–Mon', startDate: '2026-06-11', endDate: '2026-06-15', available: true },
      { label: 'Fri–Tue', startDate: '2026-06-12', endDate: '2026-06-16', available: true },
    ])
  })

  it('enforces reset day between bookings', () => {
    const existing = [
      { id: 'a', start_date: '2026-06-12', end_date: '2026-06-14' }, // Fri-Sun
    ]
    // Try to start on Mon 15th -> bePlus1 is 15th; overlaps -> error
    const start = '2026-06-15'
    const end = '2026-06-17'
    expect(validateResetRule(start, end, existing)).toMatch(/reset/)
  })

  it('treats blackouts as exact dates while preserving a wedding reset day', () => {
    const blackout = [{ id: 'blackout', kind: 'blackout' as const, start_date: '2027-08-11', end_date: '2027-08-11' }]
    expect(validateResetRule('2027-08-12', '2027-08-16', blackout)).toBeNull()
    expect(validateResetRule('2027-08-07', '2027-08-10', blackout)).toMatch(/blackout/)
  })

  it('allows conversion against the same inquiry’s hold but still rejects another hold', () => {
    const hold = { id: 'hold', kind: 'hold' as const, inquiry_id: 'lead-1', start_date: '2027-08-12', end_date: '2027-08-16' }
    expect(validateResetRule('2027-08-12', '2027-08-16', [hold], 'lead-1')).toBeNull()
    expect(validateResetRule('2027-08-12', '2027-08-16', [hold], 'lead-2')).toMatch(/conflict/)
  })

  it('respects capacity limits', () => {
    expect(validateCapacity(101, 0)).toMatch(/100/)
    expect(validateCapacity(0, 61)).toMatch(/60/)
    expect(validateCapacity(100, 60)).toBeNull()
  })

  it('caps RVs at 15', () => {
    expect(validateRvCount(15)).toBeNull()
    expect(validateRvCount(16)).toMatch(/15/)
  })

  it('requires an overage fee above 80 and calculates its total', () => {
    expect(validateReceptionOverageRate(80, 0)).toBeNull()
    expect(validateReceptionOverageRate(81, 0)).toMatch(/agreed fee/)
    expect(validateReceptionOverageRate(100, 2500)).toBeNull()
    expect(receptionOverageTotalCents(100, 2500)).toBe(50000)
  })
})
