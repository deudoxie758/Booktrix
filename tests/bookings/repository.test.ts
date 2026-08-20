import { describe, expect, it } from 'vitest'

import { bookingOrderTransactionOptions } from '@/modules/bookings/repository'

describe('booking order repository', () => {
  it('allows hosted database transactions enough time to finish validation', () => {
    expect(bookingOrderTransactionOptions).toMatchObject({ maxWait: 20_000, timeout: 20_000 })
  })
})
