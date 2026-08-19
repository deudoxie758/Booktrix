import { describe, expect, it } from 'vitest'

import { POST } from '@/app/api/bookings/create/route'
import { canonicalLegacyBookingUrl, resolveLegacyOfferingId } from '@/lib/legacy-booking'

describe('legacy booking routes', () => {
  it('retires the fake booking creation endpoint', async () => {
    const response = await POST()
    expect(response.status).toBe(410)
    await expect(response.json()).resolves.toEqual({ error: 'This booking endpoint has been retired. Use /api/bookings.' })
  })

  it('preserves a preselected service when redirecting to the canonical flow', () => {
    expect(canonicalLegacyBookingUrl('island-glow', 'wax & glow')).toBe('/book/island-glow?services=wax+%26+glow')
    expect(canonicalLegacyBookingUrl('island-glow')).toBe('/book/island-glow')
  })

  it('translates a legacy subservice id to the canonical offering id', async () => {
    const lookup = async (input: { slug: string; legacyServiceId: string }) => input.slug === 'island-glow' && input.legacyServiceId === 'legacy-wax' ? 'offering-wax' : null
    await expect(resolveLegacyOfferingId('island-glow', 'legacy-wax', lookup)).resolves.toBe('offering-wax')
    await expect(resolveLegacyOfferingId('island-glow', undefined, lookup)).resolves.toBeUndefined()
  })
})
