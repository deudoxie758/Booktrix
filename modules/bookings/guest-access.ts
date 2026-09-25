import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

const THIRTY_DAYS = 30 * 86_400_000

export const hashGuestAccessToken = (token: string) => createHash('sha256').update(token).digest('hex')

export function guestAccessForBooking(input: { idempotencyKey: string; finalAppointmentEnd: Date; secret: string }) {
  if (input.secret.length < 16) throw new Error('GUEST_ACCESS_SECRET_INVALID')
  const token = createHmac('sha256', input.secret).update(`booktrx:guest-booking:${input.idempotencyKey}`).digest('base64url')
  return {
    token,
    tokenHash: hashGuestAccessToken(token),
    expiresAt: new Date(input.finalAppointmentEnd.getTime() + THIRTY_DAYS),
  }
}

export function validateGuestAccess(
  token: string,
  record: { tokenHash: string; expiresAt: Date; revokedAt: Date | null },
  now = new Date(),
) {
  if (record.revokedAt || record.expiresAt <= now) return false
  const actual = Buffer.from(hashGuestAccessToken(token), 'hex')
  const expected = Buffer.from(record.tokenHash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
