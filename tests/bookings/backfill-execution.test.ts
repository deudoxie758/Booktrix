import { describe, expect, it } from 'vitest'

import { MARKETPLACE_BACKFILL_TRANSACTION_OPTIONS } from '../../modules/bookings/backfill-execution'

describe('marketplace scheduling backfill execution', () => {
  it('allows a bounded transaction window for remote database latency', () => {
    expect(MARKETPLACE_BACKFILL_TRANSACTION_OPTIONS).toEqual({
      maxWait: 10_000,
      timeout: 15_000,
    })
  })
})
