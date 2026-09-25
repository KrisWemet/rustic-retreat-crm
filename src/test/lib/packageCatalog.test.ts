import { describe, expect, it } from 'vitest'
import { getPackageTerms } from '@/lib/packageCatalog'

describe('published package terms', () => {
  it('keeps season prices distinct and treats GST as additional', () => {
    expect(getPackageTerms('three_day', '2026-08-14')).toMatchObject({
      season: 2026, basePriceCents: 450000, gstIncluded: false,
    })
    expect(getPackageTerms('five_day', '2027-08-11')).toMatchObject({
      season: 2027, basePriceCents: 750000, gstIncluded: false,
    })
  })

  it('includes camping and limits RVs without inventing an overage price', () => {
    expect(getPackageTerms('three_day', '2027-08-13')).toMatchObject({
      campingIncluded: true, includedCampingGuests: 60,
      includedReceptionGuests: 80, maximumReceptionGuests: 100,
      includedRvs: 8, maximumRvs: 15,
    })
  })

  it('does not quote unpublished seasons', () => {
    expect(getPackageTerms('three_day', '2028-08-11')).toBeNull()
  })
})
