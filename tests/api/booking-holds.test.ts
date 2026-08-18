import { describe, expect, it } from 'vitest'

import { parseBookingHoldRequest, toBookingHoldErrorResponse } from '@/modules/scheduling/hold-api'

describe('booking hold API contract', () => {
  it('rejects an empty service selection', () => {
    expect(() => parseBookingHoldRequest({
      businessId: 'business-1',
      locationId: 'location-1',
      checkoutIdentity: 'browser-1',
      idempotencyKey: 'request-1',
      segments: [],
    })).toThrow()
  })

  it('maps capacity conflicts to a stable public response', () => {
    expect(toBookingHoldErrorResponse({ code: 'SLOT_UNAVAILABLE' })).toEqual({
      status: 409,
      body: { code: 'SLOT_UNAVAILABLE', message: 'That time is no longer available. Please choose another.' },
    })
  })
})
