import { describe, expect, it } from 'vitest'
import { recordCashCollection, type CashCollectionRepository } from '@/modules/finance/cash-collection'

const now = new Date('2026-08-19T14:00:00.000Z')

type FakeOrder = {
  id: string
  businessId: string
  status: string
  paymentChoice: 'FULL' | 'DEPOSIT' | 'CASH'
  segments: Array<{ locationId: string; status: string; priceCents: number; depositKind: null; depositValue: null }>
}

function fixture() {
  const state = {
    actors: new Map([
      ['owner', { membershipId: 'owner-membership', businessId: 'business-a', role: 'OWNER' as const, active: true, assignedLocationIds: [] as string[] }],
      ['accounts', { membershipId: 'accounts-membership', businessId: 'business-a', role: 'ACCOUNTS' as const, active: true, assignedLocationIds: ['castries'] }],
      ['accounts-other', { membershipId: 'accounts-other-membership', businessId: 'business-a', role: 'ACCOUNTS' as const, active: true, assignedLocationIds: ['soufriere'] }],
      ['manager', { membershipId: 'manager-membership', businessId: 'business-a', role: 'MANAGER' as const, active: true, assignedLocationIds: ['castries'] }],
    ]),
    orders: new Map<string, FakeOrder>([
      ['order-1', { id: 'order-1', businessId: 'business-a', status: 'CONFIRMED', paymentChoice: 'CASH', segments: [{ locationId: 'castries', status: 'CONFIRMED', priceCents: 8000, depositKind: null, depositValue: null }] }],
      ['order-foreign', { id: 'order-foreign', businessId: 'business-b', status: 'CONFIRMED', paymentChoice: 'CASH', segments: [{ locationId: 'foreign', status: 'CONFIRMED', priceCents: 8000, depositKind: null, depositValue: null }] }],
    ]),
    collections: [] as Array<{ id: string; businessId: string; orderId: string; locationId: string; collectorId: string; kind: 'COLLECTION' | 'ADJUSTMENT'; amountCents: number; idempotencyKey: string; adjustmentOfId: string | null; note: string | null; createdAt: Date }>,
    audits: [] as Array<{ action: string; actorId: string; details: Record<string, unknown> }>,
    nextId: 1,
    locks: [] as string[],
  }

  const orderLocks = new Map<string, Promise<void>>()

  const transaction = {
    async getActorAccess({ actorId, businessId }: any) {
      const actor = state.actors.get(actorId)
      return actor?.active && actor.businessId === businessId ? actor : null
    },
    async lockOrder({ orderId, businessId }: any) {
      state.locks.push(orderId)
      const order = state.orders.get(orderId)
      if (!order || order.businessId !== businessId) return null
      return order
    },
    async findExistingByIdempotencyKey({ businessId, idempotencyKey }: any) {
      return state.collections.find((collection) => collection.businessId === businessId && collection.idempotencyKey === idempotencyKey) ?? null
    },
    async findAdjustmentTarget({ id, orderId }: any) {
      const target = state.collections.find((collection) => collection.id === id && collection.orderId === orderId)
      return target ? { id: target.id } : null
    },
    async sumCollectedCents({ orderId }: any) {
      const rows = state.collections.filter((collection) => collection.orderId === orderId)
      return {
        collectionCents: rows.filter((row) => row.kind === 'COLLECTION').reduce((sum, row) => sum + row.amountCents, 0),
        totalCents: rows.reduce((sum, row) => sum + row.amountCents, 0),
      }
    },
    async createCollection(input: any) {
      const row = { id: `collection-${state.nextId++}`, createdAt: input.now ?? now, ...input }
      state.collections.push(row)
      return row
    },
    async createAudit(input: any) {
      state.audits.push(input)
    },
  }

  // Emulates a per-order `SELECT ... FOR UPDATE` row lock: concurrent transactions
  // that lock the same orderId queue behind one another and only see committed
  // state from the prior transaction, mirroring real MySQL row-lock semantics.
  const repository: CashCollectionRepository = {
    async transaction(work) {
      const releases: Array<() => void> = []
      const scopedTransaction = {
        ...transaction,
        async lockOrder(input: any) {
          const previous = orderLocks.get(input.orderId) ?? Promise.resolve()
          let release!: () => void
          const next = new Promise<void>((resolve) => { release = resolve })
          orderLocks.set(input.orderId, previous.then(() => next))
          await previous
          releases.push(release)
          return transaction.lockOrder(input)
        },
      }
      try {
        return await work(scopedTransaction)
      } finally {
        releases.forEach((release) => release())
      }
    },
  }

  return { state, repository }
}

describe('recordCashCollection authorization', () => {
  it('allows Owner and Accounts to record cash for their authorized locations', async () => {
    const { repository } = fixture()
    const result = await recordCashCollection({ actorId: 'accounts', businessId: 'business-a', orderId: 'order-1', amountCents: 3000, idempotencyKey: 'key-1', now }, repository)
    expect(result.amountCents).toBe(3000)
    expect(result.cashCollectedCents).toBe(3000)
    expect(result.cashRemainingCents).toBe(5000)
  })

  it('denies Manager and Staff roles', async () => {
    const { repository } = fixture()
    await expect(recordCashCollection({ actorId: 'manager', businessId: 'business-a', orderId: 'order-1', amountCents: 3000, idempotencyKey: 'key-1', now }, repository))
      .rejects.toMatchObject({ code: 'FINANCE_ACCESS_DENIED' })
  })

  it('denies Accounts members outside their assigned location', async () => {
    const { repository } = fixture()
    await expect(recordCashCollection({ actorId: 'accounts-other', businessId: 'business-a', orderId: 'order-1', amountCents: 3000, idempotencyKey: 'key-1', now }, repository))
      .rejects.toMatchObject({ code: 'FINANCE_LOCATION_DENIED' })
  })

  it('rejects an order that does not belong to the actor’s business', async () => {
    const { repository } = fixture()
    await expect(recordCashCollection({ actorId: 'owner', businessId: 'business-a', orderId: 'order-foreign', amountCents: 100, idempotencyKey: 'key-1', now }, repository))
      .rejects.toMatchObject({ code: 'FINANCE_ORDER_NOT_FOUND' })
  })
})

describe('recordCashCollection over-collection guard', () => {
  it('never permits cumulative non-adjustment collection above the amount due', async () => {
    const { repository } = fixture()
    await recordCashCollection({ actorId: 'owner', businessId: 'business-a', orderId: 'order-1', amountCents: 8000, idempotencyKey: 'key-1', now }, repository)
    await expect(recordCashCollection({ actorId: 'owner', businessId: 'business-a', orderId: 'order-1', amountCents: 1, idempotencyKey: 'key-2', now }, repository))
      .rejects.toMatchObject({ code: 'FINANCE_CASH_OVER_COLLECTED' })
  })

  it('does not collect more cash than remains due under concurrent attempts', async () => {
    const { repository, state } = fixture()
    const results = await Promise.allSettled([
      recordCashCollection({ actorId: 'owner', businessId: 'business-a', orderId: 'order-1', amountCents: 8000, idempotencyKey: 'a', now }, repository),
      recordCashCollection({ actorId: 'owner', businessId: 'business-a', orderId: 'order-1', amountCents: 8000, idempotencyKey: 'b', now }, repository),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(state.collections.filter((collection) => collection.orderId === 'order-1')).toHaveLength(1)
  })

  it('rejects a non-positive amount', async () => {
    const { repository } = fixture()
    await expect(recordCashCollection({ actorId: 'owner', businessId: 'business-a', orderId: 'order-1', amountCents: 0, idempotencyKey: 'key-1', now }, repository))
      .rejects.toMatchObject({ code: 'FINANCE_CASH_INVALID_AMOUNT' })
  })
})

describe('recordCashCollection idempotency and adjustments', () => {
  it('replays an identical idempotent request without creating a duplicate record', async () => {
    const { repository, state } = fixture()
    const first = await recordCashCollection({ actorId: 'owner', businessId: 'business-a', orderId: 'order-1', amountCents: 3000, idempotencyKey: 'key-1', now }, repository)
    const second = await recordCashCollection({ actorId: 'owner', businessId: 'business-a', orderId: 'order-1', amountCents: 3000, idempotencyKey: 'key-1', now }, repository)
    expect(second.id).toBe(first.id)
    expect(state.collections).toHaveLength(1)
  })

  it('rejects idempotency-key reuse with a different amount', async () => {
    const { repository } = fixture()
    await recordCashCollection({ actorId: 'owner', businessId: 'business-a', orderId: 'order-1', amountCents: 3000, idempotencyKey: 'key-1', now }, repository)
    await expect(recordCashCollection({ actorId: 'owner', businessId: 'business-a', orderId: 'order-1', amountCents: 4000, idempotencyKey: 'key-1', now }, repository))
      .rejects.toMatchObject({ code: 'FINANCE_CASH_IDEMPOTENCY_KEY_REUSED' })
  })

  it('records an append-only adjustment referencing prior evidence without editing it, and exempts adjustments from the due cap', async () => {
    const { repository, state } = fixture()
    const collection = await recordCashCollection({ actorId: 'owner', businessId: 'business-a', orderId: 'order-1', amountCents: 8000, idempotencyKey: 'key-1', now }, repository)
    const adjustment = await recordCashCollection({ actorId: 'owner', businessId: 'business-a', orderId: 'order-1', amountCents: 500, idempotencyKey: 'key-adjustment', adjustmentOfId: collection.id, note: 'Till correction', now }, repository)

    expect(adjustment.kind).toBe('ADJUSTMENT')
    expect(state.collections).toHaveLength(2)
    expect(state.collections.every((row) => row.orderId === 'order-1')).toBe(true)
    expect(adjustment.cashCollectedCents).toBe(8500)
    expect(state.audits.some((audit) => audit.action === 'FINANCE_CASH_ADJUSTED')).toBe(true)
  })

  it('rejects an adjustment that references a collection from a different order', async () => {
    const { repository } = fixture()
    await expect(recordCashCollection({ actorId: 'owner', businessId: 'business-a', orderId: 'order-1', amountCents: 500, idempotencyKey: 'key-1', adjustmentOfId: 'nonexistent', note: 'Correction', now }, repository))
      .rejects.toMatchObject({ code: 'FINANCE_CASH_ADJUSTMENT_TARGET_INVALID' })
  })

  it('persists audit evidence for a standard collection', async () => {
    const { repository, state } = fixture()
    await recordCashCollection({ actorId: 'owner', businessId: 'business-a', orderId: 'order-1', amountCents: 3000, idempotencyKey: 'key-1', now }, repository)
    expect(state.audits.some((audit) => audit.action === 'FINANCE_CASH_COLLECTED')).toBe(true)
  })
})

describe('recordCashCollection bidirectional adjustments', () => {
  it('allows a downward adjustment (negative delta) that corrects an over-recorded collection', async () => {
    const { repository, state } = fixture()
    const collection = await recordCashCollection({ actorId: 'owner', businessId: 'business-a', orderId: 'order-1', amountCents: 5000, idempotencyKey: 'key-1', now }, repository)
    const correction = await recordCashCollection({ actorId: 'owner', businessId: 'business-a', orderId: 'order-1', amountCents: -2000, idempotencyKey: 'key-correction', adjustmentOfId: collection.id, note: 'Recorded $50 by mistake; actually $30.', now }, repository)

    expect(correction.kind).toBe('ADJUSTMENT')
    expect(correction.amountCents).toBe(-2000)
    expect(correction.cashCollectedCents).toBe(3000)
    expect(correction.cashRemainingCents).toBe(5000)
    expect(state.collections).toHaveLength(2)
    expect(state.collections.every((row) => row.orderId === 'order-1')).toBe(true)
  })

  it('rejects a downward adjustment that would drive the cumulative collected total negative', async () => {
    const { repository, state } = fixture()
    const collection = await recordCashCollection({ actorId: 'owner', businessId: 'business-a', orderId: 'order-1', amountCents: 1000, idempotencyKey: 'key-1', now }, repository)
    await expect(recordCashCollection({ actorId: 'owner', businessId: 'business-a', orderId: 'order-1', amountCents: -1500, idempotencyKey: 'key-correction', adjustmentOfId: collection.id, note: 'Overcorrection attempt', now }, repository))
      .rejects.toMatchObject({ code: 'FINANCE_CASH_ADJUSTMENT_NEGATIVE_TOTAL' })
    expect(state.collections).toHaveLength(1)
  })

  it('rejects a zero-amount adjustment', async () => {
    const { repository } = fixture()
    const collection = await recordCashCollection({ actorId: 'owner', businessId: 'business-a', orderId: 'order-1', amountCents: 1000, idempotencyKey: 'key-1', now }, repository)
    await expect(recordCashCollection({ actorId: 'owner', businessId: 'business-a', orderId: 'order-1', amountCents: 0, idempotencyKey: 'key-correction', adjustmentOfId: collection.id, note: 'no-op', now }, repository))
      .rejects.toMatchObject({ code: 'FINANCE_CASH_INVALID_AMOUNT' })
  })

  it('requires a reason for an adjustment', async () => {
    const { repository } = fixture()
    const collection = await recordCashCollection({ actorId: 'owner', businessId: 'business-a', orderId: 'order-1', amountCents: 1000, idempotencyKey: 'key-1', now }, repository)
    await expect(recordCashCollection({ actorId: 'owner', businessId: 'business-a', orderId: 'order-1', amountCents: -100, idempotencyKey: 'key-correction', adjustmentOfId: collection.id, now }, repository))
      .rejects.toMatchObject({ code: 'FINANCE_CASH_ADJUSTMENT_REASON_REQUIRED' })
  })

  it('still rejects a negative amount for a standard (non-adjustment) collection', async () => {
    const { repository } = fixture()
    await expect(recordCashCollection({ actorId: 'owner', businessId: 'business-a', orderId: 'order-1', amountCents: -500, idempotencyKey: 'key-1', now }, repository))
      .rejects.toMatchObject({ code: 'FINANCE_CASH_INVALID_AMOUNT' })
  })
})
