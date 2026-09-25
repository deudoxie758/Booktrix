import { describe, expect, it } from 'vitest'

import { parseCreateBookingRequest, toBookingErrorResponse } from '@/modules/bookings/api'

describe('booking API contract', () => {
  it('rejects a missing hold token', () => {
    expect(() => parseCreateBookingRequest({ idempotencyKey: 'order-1', paymentChoice: 'CASH' })).toThrow()
  })

  it('requires a valid guest contact snapshot', () => {
    const base = { holdToken: 'hold-1', idempotencyKey: 'order-1', paymentChoice: 'CASH' }
    expect(() => parseCreateBookingRequest({ ...base, customerName: 'G', customerEmail: 'bad', customerPhone: '12' })).toThrow()
    expect(parseCreateBookingRequest({ ...base, customerName: 'Guest Customer', customerEmail: 'GUEST@example.com', customerPhone: '+1 758 555 0101' })).toMatchObject({ customerEmail: 'guest@example.com' })
  })

  it('maps an expired hold without exposing internals', () => {
    expect(toBookingErrorResponse({ code: 'HOLD_EXPIRED' })).toEqual({ status: 409, body: { code: 'HOLD_EXPIRED', message: 'Your reserved time expired. Please choose a time again.' } })
  })

  it('maps final scheduling conflicts to a recoverable conflict response', () => {
    expect(toBookingErrorResponse({ code: 'SLOT_UNAVAILABLE' })).toEqual({
      status: 409,
      body: { code: 'SLOT_UNAVAILABLE', message: 'That time is no longer available. Please choose another.' },
    })
  })
})
