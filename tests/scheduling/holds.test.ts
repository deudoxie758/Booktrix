import { describe, expect, it } from 'vitest'

import { bookingHoldTransactionOptions, createBookingHold, getActiveHold, type HoldStore } from '@/modules/scheduling/holds'
import { schedulingLockBucketAt, schedulingRequestLockKeys } from '@/modules/scheduling/locking'

const segment = {
  offeringId: 'offering-1',
  locationId: 'location-1',
  membershipId: 'member-1',
  start: new Date('2026-08-20T14:00:00.000Z'),
  end: new Date('2026-08-20T15:00:00.000Z'),
  occupiedStart: new Date('2026-08-20T14:00:00.000Z'),
  occupiedEnd: new Date('2026-08-20T15:00:00.000Z'),
  attendeeCount: 1,
  capacity: 1,
  priceCents: 12000,
}

function memoryStore(): HoldStore {
  const holds = new Map<string, Awaited<ReturnType<HoldStore['create']>>>()
  let queue = Promise.resolve()
  const store: HoldStore = {
    transaction: async (work) => {
      const prior = queue
      let release!: () => void
      queue = new Promise<void>((resolve) => { release = resolve })
      await prior
      try { return await work(store) } finally { release() }
    },
    findByIdempotencyKey: async (key) => Array.from(holds.values()).find((hold) => hold.idempotencyKey === key) ?? null,
    findByToken: async (token) => holds.get(token) ?? null,
    validateRequestScope: async () => undefined,
    acquireRequestLocks: async () => undefined,
    deriveSegments: async (input) => input.segments.map((requested) => ({
      ...segment,
      offeringId: requested.offeringId,
      membershipId: requested.membershipId,
      start: requested.start,
      end: new Date(requested.start.getTime() + 60 * 60_000),
      occupiedStart: requested.start,
      occupiedEnd: new Date(requested.start.getTime() + 60 * 60_000),
      attendeeCount: requested.attendeeCount,
    })),
    findConflicts: async (_businessId, candidate, now) => Array.from(holds.values()).flatMap((hold) =>
      hold.expiresAt > now && !hold.consumedAt
        ? hold.segments.filter((held) => held.membershipId === candidate.membershipId && held.occupiedStart < candidate.occupiedEnd && candidate.occupiedStart < held.occupiedEnd)
        : [],
    ),
    create: async (hold) => {
      const created = { ...hold, consumedAt: null }
      holds.set(created.token, created)
      return created
    },
  }
  return store
}

describe('booking holds', () => {
  it('allows hosted database transactions enough time to finish validation', () => {
    expect(bookingHoldTransactionOptions).toMatchObject({ maxWait: 20_000, timeout: 20_000 })
  })

  it('returns the original hold for a repeated idempotency key', async () => {
    const store = memoryStore()
    const input = { businessId: 'business-1', checkoutIdentity: 'browser-1', idempotencyKey: 'checkout-1', segments: [segment] }
    const first = await createBookingHold(input, { store, now: () => new Date('2026-08-20T13:00:00.000Z') })
    const second = await createBookingHold(input, { store, now: () => new Date('2026-08-20T13:00:00.000Z') })
    expect(second.token).toBe(first.token)
  })

  it('returns an existing hold before revalidating mutable storefront scope', async () => {
    const store = memoryStore()
    const input = { businessId: 'business-1', checkoutIdentity: 'browser-1', idempotencyKey: 'stable-retry', segments: [segment] }
    const first = await createBookingHold(input, { store })
    store.validateRequestScope = async () => { throw new Error('STOREFRONT_CHANGED') }

    await expect(createBookingHold(input, { store })).resolves.toMatchObject({ token: first.token })
  })

  it('rejects an idempotency key reused by another checkout identity', async () => {
    const store = memoryStore()
    await createBookingHold(
      { businessId: 'business-1', checkoutIdentity: 'browser-1', idempotencyKey: 'shared', segments: [segment] },
      { store },
    )
    await expect(createBookingHold(
      { businessId: 'business-1', checkoutIdentity: 'browser-2', idempotencyKey: 'shared', segments: [segment] },
      { store },
    )).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' })
  })

  it('rejects an idempotency key reused for a different location', async () => {
    const store = memoryStore()
    const request = { businessId: 'business-1', checkoutIdentity: 'browser-1', idempotencyKey: 'location-bound', segments: [segment] }
    await createBookingHold({ ...request, locationId: 'location-1' }, { store })
    await expect(createBookingHold({ ...request, locationId: 'location-2' }, { store }))
      .rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' })
  })

  it('allows only one simultaneous hold at capacity one', async () => {
    const store = memoryStore()
    const dependencies = { store, now: () => new Date('2026-08-20T13:00:00.000Z') }
    const results = await Promise.allSettled([
      createBookingHold({ businessId: 'business-1', checkoutIdentity: 'one', idempotencyKey: 'one', segments: [segment] }, dependencies),
      createBookingHold({ businessId: 'business-1', checkoutIdentity: 'two', idempotencyKey: 'two', segments: [segment] }, dependencies),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({ reason: { code: 'SLOT_UNAVAILABLE' } })
  })

  it('treats a professional as exclusive across unrelated offerings regardless of capacity', async () => {
    const store = memoryStore()
    const first = { ...segment, offeringId: 'offering-1', capacity: 10 }
    const second = { ...segment, offeringId: 'offering-2', capacity: 10 }
    await createBookingHold({ businessId: 'business-1', checkoutIdentity: 'one', idempotencyKey: 'one-exclusive', segments: [first] }, { store })
    await expect(createBookingHold({ businessId: 'business-1', checkoutIdentity: 'two', idempotencyKey: 'two-exclusive', segments: [second] }, { store }))
      .rejects.toMatchObject({ code: 'SLOT_UNAVAILABLE' })
  })

  it('validates request scope before acquiring locks and deriving scheduling facts', async () => {
    const store = memoryStore()
    const calls: string[] = []
    store.validateRequestScope = async () => { calls.push('validate') }
    store.acquireRequestLocks = async () => { calls.push('lock') }
    store.deriveSegments = async (input) => { calls.push('derive'); return input.segments as any }
    await createBookingHold({ businessId: 'business-1', checkoutIdentity: 'browser', idempotencyKey: 'ordered', segments: [segment] }, { store })
    expect(calls.slice(0, 3)).toEqual(['validate', 'lock', 'derive'])
  })

  it('uses the same professional lock namespace across locations', () => {
    const base = { businessId: 'business-1', membershipId: 'member-1', start: new Date('2026-08-20T14:00:00.000Z') }
    expect(schedulingRequestLockKeys({ ...base, locationId: 'location-1', offeringId: 'offering-1' }).filter((key) => key.includes(':professional:')))
      .toEqual(schedulingRequestLockKeys({ ...base, locationId: 'location-2', offeringId: 'offering-2' }).filter((key) => key.includes(':professional:')))
  })

  it('recovers the complete ISO bucket timestamp from a scheduling lock key', () => {
    const [key] = schedulingRequestLockKeys({
      businessId: 'business-1',
      locationId: 'location-1',
      offeringId: 'offering-1',
      membershipId: 'member-1',
      start: new Date('2026-08-25T13:00:00.000Z'),
    })

    expect(schedulingLockBucketAt(key)).toEqual(new Date('2026-08-24T00:00:00.000Z'))
  })

  it('does not return an expired hold as active', async () => {
    const store = memoryStore()
    const created = await createBookingHold(
      { businessId: 'business-1', checkoutIdentity: 'browser-1', idempotencyKey: 'expires', segments: [segment] },
      { store, now: () => new Date('2026-08-20T13:00:00.000Z') },
    )
    await expect(getActiveHold(created.token, { store, now: () => new Date('2026-08-20T13:11:00.000Z') }))
      .rejects.toMatchObject({ code: 'HOLD_EXPIRED' })
  })
})
