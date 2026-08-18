import { describe, expect, it } from 'vitest'

import { parseCreateBookingRequest, toBookingErrorResponse } from '@/modules/bookings/api'

describe('booking API contract', () => {
  it('rejects a missing hold token', () => {
    expect(() => parseCreateBookingRequest({ idempotencyKey: 'order-1', paymentChoice: 'CASH' })).toThrow()
  })

  it('maps an expired hold without exposing internals', () => {
    expect(toBookingErrorResponse({ code: 'HOLD_EXPIRED' })).toEqual({ status: 409, body: { code: 'HOLD_EXPIRED', message: 'Your reserved time expired. Please choose a time again.' } })
  })
})
