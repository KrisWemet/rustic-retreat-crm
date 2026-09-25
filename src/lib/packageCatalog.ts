// Published season prices are copied from the Rustic Retreat booking pages.
// Add a new version for each season; never edit terms already attached to a booking.
export const PACKAGE_CATALOG_VERSION = '2026-09-23' as const

export type OfferedPackage = 'three_day' | 'five_day'

export type PackageTerms = {
  version: typeof PACKAGE_CATALOG_VERSION
  season: number
  package: OfferedPackage
  name: string
  basePriceCents: number
  currency: 'CAD'
  gstIncluded: false
  campingIncluded: true
  includedReceptionGuests: 80
  maximumReceptionGuests: 100
  includedCampingGuests: 60
  includedRvs: 8
  maximumRvs: 15
}

const prices: Record<number, Record<OfferedPackage, number>> = {
  2026: { three_day: 450000, five_day: 550000 },
  2027: { three_day: 650000, five_day: 750000 },
}

export function getPackageTerms(pkg: OfferedPackage, startISO: string): PackageTerms | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startISO) || Number.isNaN(new Date(startISO).getTime())) return null
  const season = Number(startISO.slice(0, 4))
  const basePriceCents = prices[season]?.[pkg]
  if (!basePriceCents) return null

  return {
    version: PACKAGE_CATALOG_VERSION,
    season,
    package: pkg,
    name: pkg === 'three_day' ? 'Classic 3-Day Weekend' : 'Full 5-Day Experience',
    basePriceCents,
    currency: 'CAD',
    gstIncluded: false,
    campingIncluded: true,
    includedReceptionGuests: 80,
    maximumReceptionGuests: 100,
    includedCampingGuests: 60,
    includedRvs: 8,
    maximumRvs: 15,
  }
}
