import { describe, expect, it } from 'vitest'

import { assertOrderTransition, assertSegmentTransition } from '@/modules/bookings/transitions'

describe('booking transitions', () => {
  it('allows a requested segment to be confirmed', () => {
    expect(() => assertSegmentTransition('REQUESTED', 'CONFIRMED')).not.toThrow()
  })

  it('rejects a completed segment returning to confirmed', () => {
    expect(() => assertSegmentTransition('COMPLETED', 'CONFIRMED')).toThrow('INVALID_BOOKING_TRANSITION')
  })

  it('allows a mixed order to become partially cancelled', () => {
    expect(() => assertOrderTransition('CONFIRMED', 'PARTIALLY_CANCELLED')).not.toThrow()
  })
})
