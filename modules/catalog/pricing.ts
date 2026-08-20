import type { PriceBreakdown } from './types'

export function calculateOfferingPrice(input: {
  priceCents: number
  attendeeCount: number
  capacity: number
}): PriceBreakdown {
  if (!Number.isInteger(input.priceCents) || input.priceCents < 0) throw new Error('INVALID_PRICE')
  if (!Number.isInteger(input.attendeeCount) || input.attendeeCount < 1) throw new Error('INVALID_ATTENDEE_COUNT')
  if (!Number.isInteger(input.capacity) || input.capacity < 1) throw new Error('INVALID_CAPACITY')
  if (input.attendeeCount > input.capacity) throw new Error('ATTENDEE_CAPACITY_EXCEEDED')

  return {
    unitPriceCents: input.priceCents,
    attendeeCount: input.attendeeCount,
    totalCents: input.priceCents * input.attendeeCount,
    currency: 'XCD',
  }
}
