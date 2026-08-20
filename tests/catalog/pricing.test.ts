import { describe, expect, it } from 'vitest'

import { calculateOfferingPrice } from '@/modules/catalog/pricing'

describe('catalog pricing', () => {
  it('multiplies an offering price by attendee count', () => {
    expect(calculateOfferingPrice({ priceCents: 7500, attendeeCount: 3, capacity: 4 })).toEqual({
      unitPriceCents: 7500,
      attendeeCount: 3,
      totalCents: 22500,
      currency: 'XCD',
    })
  })

  it('rejects attendee counts over capacity', () => {
    expect(() => calculateOfferingPrice({ priceCents: 7500, attendeeCount: 5, capacity: 4 })).toThrow(
      'ATTENDEE_CAPACITY_EXCEEDED',
    )
  })
})
