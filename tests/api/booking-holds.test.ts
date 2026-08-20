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

  it('accepts only client-owned segment fields and discards forged derived values', () => {
    const parsed = parseBookingHoldRequest({
      businessId: 'business-1',
      locationId: 'location-1',
      checkoutIdentity: 'browser-1',
      idempotencyKey: 'request-1',
      segments: [{
        offeringId: 'service-1',
        membershipId: 'member-1',
        start: '2026-08-20T14:00:00.000Z',
        attendeeCount: 1,
        end: '2030-01-01T00:00:00.000Z',
        occupiedStart: '2020-01-01T00:00:00.000Z',
        occupiedEnd: '2030-01-01T00:00:00.000Z',
        capacity: 999,
        priceCents: 1,
      }],
    })

    expect(parsed.segments).toEqual([{
      offeringId: 'service-1',
      membershipId: 'member-1',
      start: new Date('2026-08-20T14:00:00.000Z'),
      attendeeCount: 1,
    }])
  })

  it('maps capacity conflicts to a stable public response', () => {
    expect(toBookingHoldErrorResponse({ code: 'SLOT_UNAVAILABLE' })).toEqual({
      status: 409,
      body: { code: 'SLOT_UNAVAILABLE', message: 'That time is no longer available. Please choose another.' },
    })
  })

  it('bounds public hold size before database locks are acquired', () => {
    const segment = {
      offeringId: 'service-1',
      membershipId: 'member-1',
      start: '2026-08-20T14:00:00.000Z',
      attendeeCount: 1,
    }
    const request = {
      businessId: 'business-1',
      locationId: 'location-1',
      checkoutIdentity: 'browser-1',
      idempotencyKey: 'request-1',
      segments: Array.from({ length: 21 }, () => segment),
    }

    expect(() => parseBookingHoldRequest(request)).toThrow()
    expect(() => parseBookingHoldRequest({ ...request, segments: [segment], idempotencyKey: 'x'.repeat(64) })).not.toThrow()
    expect(() => parseBookingHoldRequest({ ...request, segments: [segment], idempotencyKey: 'x'.repeat(65) })).toThrow()
  })
})
