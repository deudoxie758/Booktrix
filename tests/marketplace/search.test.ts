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
})
