import { describe, expect, it } from 'vitest'

import { searchMarketplace } from '@/modules/marketplace/search'

describe('marketplace search', () => {
  it('normalizes filters and excludes non-published repository records', async () => {
    const results = await searchMarketplace(
      { query: '  Massage ', district: ' Castries ', take: 12 },
      { list: async () => [
        { id: 'one', businessStatus: 'PUBLISHED' as const, businessName: 'Calm', businessSlug: 'calm', coverImageUrl: '/images/calm.png', offeringName: 'Massage', category: 'Wellness', priceCents: 12000, durationMinutes: 60, locations: [{ name: 'City', address: 'Castries' }] },
        { id: 'two', businessStatus: 'SUSPENDED' as const, businessName: 'Closed', businessSlug: 'closed', offeringName: 'Massage', category: 'Wellness', priceCents: 9000, durationMinutes: 45, locations: [{ name: 'Town', address: 'Castries' }] },
      ] },
    )
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ businessSlug: 'calm', coverImageUrl: '/images/calm.png', startingPriceCents: 12000 })
  })

  it('applies take after offerings are grouped into storefronts', async () => {
    const row = (id: string, businessName: string, businessSlug: string) => ({ id, businessStatus: 'PUBLISHED' as const, businessName, businessSlug, offeringName: id, category: 'Wellness', priceCents: 10000, durationMinutes: 60, locations: [{ name: 'City', address: 'Castries' }] })
    const results = await searchMarketplace(
      { take: 2 },
      { list: async () => [row('one-a', 'One', 'one'), row('one-b', 'One', 'one'), row('two-a', 'Two', 'two'), row('three-a', 'Three', 'three')] },
    )
    expect(results.map((result) => result.businessSlug)).toEqual(['one', 'three'])
  })

  it('prioritizes storefronts with completed cover imagery', async () => {
    const base = { businessStatus: 'PUBLISHED' as const, offeringName: 'Service', category: 'Wellness', priceCents: 10000, durationMinutes: 60, locations: [{ name: 'City', address: 'Castries' }] }
    const results = await searchMarketplace({ take: 1 }, { list: async () => [
      { ...base, id: 'plain', businessName: 'Plain', businessSlug: 'plain' },
      { ...base, id: 'illustrated', businessName: 'Illustrated', businessSlug: 'illustrated', coverImageUrl: '/images/illustrated.png' },
    ] })
    expect(results[0]?.businessSlug).toBe('illustrated')
  })

  it('ranks each storefront by its nearest valid location', async () => {
    const base = { businessStatus: 'PUBLISHED' as const, offeringName: 'Service', category: 'Wellness', priceCents: 10000, durationMinutes: 60 }
    const results = await searchMarketplace(
      { latitude: '14.0101', longitude: '-60.9875' },
      { list: async () => [
        { ...base, id: 'far', businessName: 'Far', businessSlug: 'far', locations: [{ name: 'Far north', address: 'North', latitude: 14.5, longitude: -60.9 }, { name: 'Far south', address: 'South', latitude: 13.7, longitude: -61.0 }] },
        { ...base, id: 'near', businessName: 'Near', businessSlug: 'near', locations: [{ name: 'Nearby', address: 'Castries', latitude: 14.011, longitude: -60.988 }] },
      ] },
    )
    expect(results.map((result) => result.businessSlug)).toEqual(['near', 'far'])
    expect(results[0]?.distanceKm).toBeLessThan(1)
  })

  it.each([
    { latitude: 'NaN', longitude: '-60.9' },
    { latitude: '91', longitude: '-60.9' },
    { latitude: '14', longitude: undefined },
  ])('ignores invalid coordinates and keeps deterministic manual ordering', async (coordinates) => {
    const base = { businessStatus: 'PUBLISHED' as const, offeringName: 'Service', category: 'Wellness', priceCents: 10000, durationMinutes: 60, locations: [{ name: 'City', address: 'Castries', latitude: 14.01, longitude: -60.98 }] }
    const results = await searchMarketplace(coordinates, { list: async () => [
      { ...base, id: 'beta', businessName: 'Beta', businessSlug: 'beta' },
      { ...base, id: 'alpha', businessName: 'Alpha', businessSlug: 'alpha' },
    ] })
    expect(results.map((result) => result.businessSlug)).toEqual(['alpha', 'beta'])
  })

  it('uses business name and slug as deterministic equal-distance tie breakers', async () => {
    const base = { businessStatus: 'PUBLISHED' as const, offeringName: 'Service', category: 'Wellness', priceCents: 10000, durationMinutes: 60, locations: [{ name: 'Same place', address: 'Castries', latitude: 14.01, longitude: -60.98 }] }
    const results = await searchMarketplace({ latitude: '14', longitude: '-61' }, { list: async () => [
      { ...base, id: 'z', businessName: 'Same', businessSlug: 'zeta' },
      { ...base, id: 'a', businessName: 'Same', businessSlug: 'alpha' },
    ] })
    expect(results.map((result) => result.businessSlug)).toEqual(['alpha', 'zeta'])
  })
})
