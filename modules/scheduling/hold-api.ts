import { z } from 'zod'

const segmentSchema = z.object({
  offeringId: z.string().min(1),
  membershipId: z.string().min(1),
  start: z.coerce.date(),
  attendeeCount: z.number().int().min(1),
})

const requestSchema = z.object({
  businessId: z.string().min(1),
  locationId: z.string().min(1),
  customerId: z.string().min(1).nullable().optional(),
  checkoutIdentity: z.string().min(1),
  idempotencyKey: z.string().min(1),
  segments: z.array(segmentSchema).min(1),
})

export const parseBookingHoldRequest = (input: unknown) => requestSchema.parse(input)

export function toBookingHoldErrorResponse(error: { code?: string }) {
  if (error.code === 'SLOT_UNAVAILABLE') return {
    status: 409,
    body: { code: 'SLOT_UNAVAILABLE', message: 'That time is no longer available. Please choose another.' },
  }
  return { status: 422, body: { code: 'INVALID_SELECTION', message: 'Check your booking selection and try again.' } }
}
