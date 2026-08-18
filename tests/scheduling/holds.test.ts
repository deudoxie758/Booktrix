import { describe, expect, it } from 'vitest'

import { createBookingHold, getActiveHold, type HoldStore } from '@/modules/scheduling/holds'

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
    findConflicts: async (candidate, now) => Array.from(holds.values()).flatMap((hold) =>
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
  it('returns the original hold for a repeated idempotency key', async () => {
    const store = memoryStore()
    const input = { businessId: 'business-1', checkoutIdentity: 'browser-1', idempotencyKey: 'checkout-1', segments: [segment] }
    const first = await createBookingHold(input, { store, now: () => new Date('2026-08-20T13:00:00.000Z') })
    const second = await createBookingHold(input, { store, now: () => new Date('2026-08-20T13:00:00.000Z') })
    expect(second.token).toBe(first.token)
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
