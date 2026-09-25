import { describe, expect, it } from 'vitest'

import { guestAccessForBooking, hashGuestAccessToken, validateGuestAccess } from '@/modules/bookings/guest-access'

describe('guest booking access', () => {
  it('creates a stable high-entropy token without storing the raw value', () => {
    const first = guestAccessForBooking({ idempotencyKey: 'request-1', finalAppointmentEnd: new Date('2026-10-01T15:00:00Z'), secret: 'a-secure-test-secret' })
    const retry = guestAccessForBooking({ idempotencyKey: 'request-1', finalAppointmentEnd: new Date('2026-10-01T15:00:00Z'), secret: 'a-secure-test-secret' })
    expect(first.token).toBe(retry.token)
    expect(first.token.length).toBeGreaterThanOrEqual(43)
    expect(first.tokenHash).toBe(hashGuestAccessToken(first.token))
    expect(first.tokenHash).not.toContain(first.token)
    expect(first.expiresAt).toEqual(new Date('2026-10-31T15:00:00Z'))
  })

  it('allows only the matching, active, unrevoked token', () => {
    const token = 'guest-token'
    const record = { tokenHash: hashGuestAccessToken(token), expiresAt: new Date('2026-11-01T00:00:00Z'), revokedAt: null }
    expect(validateGuestAccess(token, record, new Date('2026-10-01T00:00:00Z'))).toBe(true)
    expect(validateGuestAccess('wrong', record, new Date('2026-10-01T00:00:00Z'))).toBe(false)
    expect(validateGuestAccess(token, { ...record, revokedAt: new Date() }, new Date('2026-10-01T00:00:00Z'))).toBe(false)
    expect(validateGuestAccess(token, record, new Date('2026-11-01T00:00:00Z'))).toBe(false)
  })
})
