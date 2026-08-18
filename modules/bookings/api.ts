import { z } from 'zod'

const schema = z.object({
  holdToken: z.string().min(1),
  idempotencyKey: z.string().min(1),
  paymentChoice: z.enum(['FULL', 'DEPOSIT', 'CASH']),
})

export const parseCreateBookingRequest = (input: unknown) => schema.parse(input)

export function toBookingErrorResponse(error: { code?: string }) {
  if (error.code === 'HOLD_EXPIRED') return { status: 409, body: { code: 'HOLD_EXPIRED', message: 'Your reserved time expired. Please choose a time again.' } }
  if (error.code === 'AUTHENTICATION_REQUIRED') return { status: 401, body: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to complete your booking.' } }
  return { status: 422, body: { code: 'INVALID_BOOKING', message: 'Check your booking details and try again.' } }
}
