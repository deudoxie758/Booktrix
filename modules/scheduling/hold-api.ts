import { z } from 'zod'

const identifier = z.string().min(1).max(64)

const segmentSchema = z.object({
  offeringId: identifier,
  membershipId: identifier,
  start: z.coerce.date(),
  attendeeCount: z.number().int().min(1),
})

const requestSchema = z.object({
  businessId: identifier,
  locationId: identifier,
  customerId: identifier.nullable().optional(),
  checkoutIdentity: identifier,
  idempotencyKey: identifier,
  segments: z.array(segmentSchema).min(1).max(20),
})

export const parseBookingHoldRequest = (input: unknown) => requestSchema.parse(input)

export function toBookingHoldErrorResponse(error: { code?: string }) {
  if (error.code === 'SLOT_UNAVAILABLE') return {
    status: 409,
    body: { code: 'SLOT_UNAVAILABLE', message: 'That time is no longer available. Please choose another.' },
  }
  return { status: 422, body: { code: 'INVALID_SELECTION', message: 'Check your booking selection and try again.' } }
}
