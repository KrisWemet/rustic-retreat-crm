import { describe, it, expect } from 'vitest'
import { computeEndDate, validateCapacity, validatePackageWindow, validateResetRule } from '@/lib/validators/booking'

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

  it('validates 5-day Wed-Mon', () => {
    const start = '2026-06-10' // Wed
    const end = computeEndDate('five_day', start)
    expect(validatePackageWindow('five_day', start, end)).toBeNull()
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

  it('respects capacity limits', () => {
    expect(validateCapacity(81, 0)).toMatch(/80/)
    expect(validateCapacity(0, 61)).toMatch(/60/)
    expect(validateCapacity(80, 60)).toBeNull()
  })
})

