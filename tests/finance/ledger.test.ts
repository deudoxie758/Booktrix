import { describe, expect, it, vi } from 'vitest'
import { classifyOrderFinance, createFinanceCsv, loadFinanceLedger } from '@/modules/finance/ledger'

const now = new Date('2026-08-19T14:00:00.000Z')

describe('classifyOrderFinance', () => {
  it('excludes cancelled orders entirely from earned totals', () => {
    const cancelledOrder = {
      status: 'CANCELLED',
      paymentChoice: 'CASH' as const,
      segments: [{ status: 'CANCELLED', priceCents: 12000, depositKind: null, depositValue: null }],
    }
    expect(classifyOrderFinance(cancelledOrder)).toEqual({ bookedCents: 0, cancelledCents: 12000, cashDueCents: 0 })
  })

  it('books the full amount as cash due for an active cash order', () => {
    const activeCashOrder = {
      status: 'CONFIRMED',
      paymentChoice: 'CASH' as const,
      segments: [{ status: 'CONFIRMED', priceCents: 12000, depositKind: null, depositValue: null }],
    }
    expect(classifyOrderFinance(activeCashOrder)).toEqual({ bookedCents: 12000, cancelledCents: 0, cashDueCents: 12000 })
  })

  it('splits multi-segment partial cancellation between booked and cancelled buckets', () => {
    const order = {
      status: 'PARTIALLY_CANCELLED',
      paymentChoice: 'CASH' as const,
      segments: [
        { status: 'CANCELLED', priceCents: 5000, depositKind: null, depositValue: null },
        { status: 'CONFIRMED', priceCents: 7000, depositKind: null, depositValue: null },
      ],
    }
    expect(classifyOrderFinance(order)).toEqual({ bookedCents: 7000, cancelledCents: 5000, cashDueCents: 7000 })
  })

  it('recognizes completed segments as booked/earned revenue with no cash due once paid online', () => {
    const order = {
      status: 'COMPLETED',
      paymentChoice: 'FULL' as const,
      segments: [{ status: 'COMPLETED', priceCents: 9000, depositKind: null, depositValue: null }],
    }
    expect(classifyOrderFinance(order)).toEqual({ bookedCents: 9000, cancelledCents: 0, cashDueCents: 0 })
  })

  it('prorates deposit-choice cash due per segment using each offering’s own deposit rule', () => {
    const order = {
      status: 'CONFIRMED',
      paymentChoice: 'DEPOSIT' as const,
      segments: [
        { status: 'CONFIRMED', priceCents: 10000, depositKind: 'PERCENTAGE' as const, depositValue: 20 },
        { status: 'CONFIRMED', priceCents: 6000, depositKind: 'FIXED' as const, depositValue: 1000 },
      ],
    }
    // segment 1: 20% of 10000 = 2000 due online, 8000 due at appointment
    // segment 2: fixed 1000 due online, 5000 due at appointment
    expect(classifyOrderFinance(order)).toEqual({ bookedCents: 16000, cancelledCents: 0, cashDueCents: 13000 })
  })

  it('excludes rejected (never-confirmed) segments from both booked and cancelled totals', () => {
    const order = {
      status: 'REQUESTED',
      paymentChoice: 'CASH' as const,
      segments: [
        { status: 'REJECTED', priceCents: 4000, depositKind: null, depositValue: null },
        { status: 'REQUESTED', priceCents: 6000, depositKind: null, depositValue: null },
      ],
    }
    expect(classifyOrderFinance(order)).toEqual({ bookedCents: 6000, cancelledCents: 0, cashDueCents: 6000 })
  })

  it('treats a whole-order CANCELLED status as fully cancelled even if a segment status lags', () => {
    const order = {
      status: 'CANCELLED',
      paymentChoice: 'CASH' as const,
      segments: [{ status: 'CONFIRMED', priceCents: 5000, depositKind: null, depositValue: null }],
    }
    expect(classifyOrderFinance(order)).toEqual({ bookedCents: 0, cancelledCents: 5000, cashDueCents: 0 })
  })
})

function makeOrder(overrides: Partial<any> = {}) {
  return {
    id: 'order-1',
    status: 'CONFIRMED',
    paymentChoice: 'CASH',
    subtotalCents: 12000,
    createdAt: now,
    customerName: null,
    customer: { name: 'Kai Joseph' },
    PaymentRequest: null,
    Segments: [{ locationId: 'castries', status: 'CONFIRMED', priceCents: 12000, startsAt: now, offering: { depositKind: null, depositValue: null } }],
    CashCollections: [],
    ...overrides,
  }
}

function context(overrides: Partial<any> = {}) {
  return {
    business: { id: 'business-1', name: 'Island Glow' },
    membership: { id: 'accounts-membership', role: 'ACCOUNTS' },
    availableLocations: [{ id: 'castries', name: 'Castries' }, { id: 'soufriere', name: 'Soufrière' }],
    ...overrides,
  }
}

describe('loadFinanceLedger', () => {
  it('scopes the ledger query to the actor’s authorized locations and denies a foreign location filter', async () => {
    const queryOrders = vi.fn().mockResolvedValue([])
    const resolveContext = vi.fn().mockResolvedValue(context())

    await expect(loadFinanceLedger({ actorId: 'accounts-1', now, rawFilters: { locationId: 'foreign-location' } }, { resolveContext, queryOrders }))
      .rejects.toMatchObject({ code: 'FINANCE_LOCATION_DENIED' })

    await loadFinanceLedger({ actorId: 'accounts-1', now, rawFilters: {} }, { resolveContext, queryOrders })
    const passedFilters = queryOrders.mock.calls[0][1]
    expect(passedFilters.locationId).toBeNull()
  })

  it('rejects a business role other than Owner or Accounts', async () => {
    const resolveContext = vi.fn().mockRejectedValue(Object.assign(new Error('FINANCE_ACCESS_DENIED'), { code: 'FINANCE_ACCESS_DENIED' }))
    await expect(loadFinanceLedger({ actorId: 'manager-1', now, rawFilters: {} }, { resolveContext, queryOrders: vi.fn() }))
      .rejects.toMatchObject({ code: 'FINANCE_ACCESS_DENIED' })
  })

  it('parses Saint Lucia calendar-day filters into UTC boundaries passed to the query', async () => {
    const queryOrders = vi.fn().mockResolvedValue([])
    const resolveContext = vi.fn().mockResolvedValue(context())

    await loadFinanceLedger({ actorId: 'accounts-1', now, rawFilters: { fromDate: '2026-08-19', toDate: '2026-08-19' } }, { resolveContext, queryOrders })

    const passedFilters = queryOrders.mock.calls[0][1]
    expect(passedFilters.from).toEqual(new Date('2026-08-19T04:00:00.000Z'))
    expect(passedFilters.to).toEqual(new Date('2026-08-20T04:00:00.000Z'))
  })

  it('builds booked/completed/cancelled summary totals and pending online-payment counts, excluding cancelled value from earned totals', async () => {
    const orders = [
      makeOrder({ id: 'booked', status: 'CONFIRMED', subtotalCents: 12000, Segments: [{ locationId: 'castries', status: 'CONFIRMED', priceCents: 12000, startsAt: now, offering: { depositKind: null, depositValue: null } }] }),
      makeOrder({ id: 'completed', status: 'COMPLETED', paymentChoice: 'FULL', subtotalCents: 9000, Segments: [{ locationId: 'castries', status: 'COMPLETED', priceCents: 9000, startsAt: now, offering: { depositKind: null, depositValue: null } }] }),
      makeOrder({ id: 'cancelled', status: 'CANCELLED', subtotalCents: 5000, Segments: [{ locationId: 'castries', status: 'CANCELLED', priceCents: 5000, startsAt: now, offering: { depositKind: null, depositValue: null } }] }),
      makeOrder({ id: 'pending-online', status: 'PAYMENT_PENDING', paymentChoice: 'FULL', subtotalCents: 6000, PaymentRequest: { status: 'PENDING', amountCents: 6000 }, Segments: [{ locationId: 'castries', status: 'REQUESTED', priceCents: 6000, startsAt: now, offering: { depositKind: null, depositValue: null } }] }),
    ]
    const queryOrders = vi.fn().mockResolvedValue(orders)
    const resolveContext = vi.fn().mockResolvedValue(context())

    const model = await loadFinanceLedger({ actorId: 'accounts-1', now, rawFilters: {} }, { resolveContext, queryOrders })

    expect(model.summary.bookedRevenueCents).toBe(12000 + 6000)
    expect(model.summary.completedRevenueCents).toBe(9000)
    expect(model.summary.cancelledRevenueCents).toBe(5000)
    expect(model.summary.pendingOnlinePaymentCents).toBe(6000)
    expect(model.summary.pendingOnlinePaymentRequests).toBe(1)
    expect(model.rows.map((row) => row.orderId)).toEqual(expect.arrayContaining(['booked', 'completed', 'cancelled', 'pending-online']))
  })

  it('nets cash collected and cash remaining per row from append-only CashCollection evidence', async () => {
    const orders = [makeOrder({ CashCollections: [{ amountCents: 5000, kind: 'COLLECTION' }, { amountCents: 2000, kind: 'ADJUSTMENT' }] })]
    const queryOrders = vi.fn().mockResolvedValue(orders)
    const resolveContext = vi.fn().mockResolvedValue(context())

    const model = await loadFinanceLedger({ actorId: 'accounts-1', now, rawFilters: {} }, { resolveContext, queryOrders })

    expect(model.rows[0].cashDueCents).toBe(12000)
    expect(model.rows[0].cashCollectedCents).toBe(7000)
    expect(model.rows[0].cashRemainingCents).toBe(5000)
  })

  it('filters rows by booking status and payment state without altering the location-scoped summary', async () => {
    const orders = [
      makeOrder({ id: 'confirmed', status: 'CONFIRMED' }),
      makeOrder({ id: 'cancelled', status: 'CANCELLED', Segments: [{ locationId: 'castries', status: 'CANCELLED', priceCents: 12000, startsAt: now, offering: { depositKind: null, depositValue: null } }] }),
    ]
    const queryOrders = vi.fn().mockResolvedValue(orders)
    const resolveContext = vi.fn().mockResolvedValue(context())

    const model = await loadFinanceLedger({ actorId: 'accounts-1', now, rawFilters: { status: 'CANCELLED' } }, { resolveContext, queryOrders })

    expect(model.rows.map((row) => row.orderId)).toEqual(['cancelled'])
    expect(model.summary.cancelledRevenueCents).toBe(12000)
    expect(model.summary.bookedRevenueCents).toBe(12000)
  })

  it('paginates ledger rows', async () => {
    const orders = Array.from({ length: 30 }, (_, index) => makeOrder({ id: `order-${index}`, createdAt: new Date(now.getTime() - index * 1000) }))
    const queryOrders = vi.fn().mockResolvedValue(orders)
    const resolveContext = vi.fn().mockResolvedValue(context())

    const pageOne = await loadFinanceLedger({ actorId: 'accounts-1', now, rawFilters: {} }, { resolveContext, queryOrders })
    expect(pageOne.rows).toHaveLength(pageOne.pageSize)
    expect(pageOne.totalRows).toBe(30)
    expect(pageOne.totalPages).toBe(Math.ceil(30 / pageOne.pageSize))

    const pageTwo = await loadFinanceLedger({ actorId: 'accounts-1', now, rawFilters: { page: '2' } }, { resolveContext, queryOrders })
    expect(pageTwo.rows[0].orderId).not.toBe(pageOne.rows[0].orderId)
  })

  it('exposes each order’s individual cash-collection evidence so the UI can reference a specific entry for a correction', async () => {
    const orders = [makeOrder({ CashCollections: [
      { id: 'collection-1', kind: 'COLLECTION', amountCents: 5000, createdAt: now, note: null },
      { id: 'collection-2', kind: 'ADJUSTMENT', amountCents: -1000, createdAt: now, note: 'Till correction' },
    ] })]
    const queryOrders = vi.fn().mockResolvedValue(orders)
    const resolveContext = vi.fn().mockResolvedValue(context())

    const model = await loadFinanceLedger({ actorId: 'accounts-1', now, rawFilters: {} }, { resolveContext, queryOrders })

    expect(model.rows[0].collections).toEqual([
      { id: 'collection-1', kind: 'COLLECTION', amountCents: 5000, createdAt: now, note: null },
      { id: 'collection-2', kind: 'ADJUSTMENT', amountCents: -1000, createdAt: now, note: 'Till correction' },
    ])
    expect(model.rows[0].cashCollectedCents).toBe(4000)
  })

  it('documents that a segment cancelled after cash was already collected against it produces a negative cash-remaining figure, surfaced truthfully rather than clamped or hidden', async () => {
    // This is a real, currently-unresolved reconciliation edge case: booking-segment
    // status mutations (modules/bookings/management.ts) are not serialized against the
    // finance module's per-order cash-collection lock, and cashDueCents is always
    // recomputed live from current segment status. An entirely ordinary *sequential*
    // flow — collect cash while a segment is CONFIRMED, then a manager cancels that
    // segment afterward via manageBookingSegment (which does not cascade the parent
    // order's stored `status`) — reaches this state with no race involved. The root
    // cause is out of scope for the finance module; this test exists to document the
    // behavior and prove the ledger surfaces it truthfully instead of crashing or
    // silently clamping to zero.
    const orders = [makeOrder({
      status: 'CONFIRMED', // stale: not cascaded when the only segment was cancelled
      Segments: [{ locationId: 'castries', status: 'CANCELLED', priceCents: 12000, startsAt: now, offering: { depositKind: null, depositValue: null } }],
      CashCollections: [{ id: 'collection-1', kind: 'COLLECTION', amountCents: 8000, createdAt: now, note: null }],
    })]
    const queryOrders = vi.fn().mockResolvedValue(orders)
    const resolveContext = vi.fn().mockResolvedValue(context())

    const model = await loadFinanceLedger({ actorId: 'accounts-1', now, rawFilters: {} }, { resolveContext, queryOrders })

    expect(model.rows[0].cashDueCents).toBe(0)
    expect(model.rows[0].cashCollectedCents).toBe(8000)
    expect(model.rows[0].cashRemainingCents).toBe(-8000)
  })
})

describe('createFinanceCsv', () => {
  it('escapes commas, quotes, newlines, and spreadsheet formula prefixes', () => {
    const model = {
      business: { id: 'business-1', name: 'Island Glow' },
      locations: [{ id: 'castries', name: 'Castries' }],
      filters: { from: null, to: null, locationId: null, status: 'ALL' as const, paymentState: 'ALL' as const, page: 1 },
      summary: { bookedRevenueCents: 0, completedRevenueCents: 0, cancelledRevenueCents: 0, cashDueCents: 0, cashCollectedCents: 0, cashRemainingCents: 0, pendingOnlinePaymentCents: 0, pendingOnlinePaymentRequests: 0 },
      rows: [{
        orderId: 'order-1', createdAt: now, customerName: '=cmd|\'/c calc\'!A1, "Kai"\nJoseph', locationId: 'castries', locationName: 'Castries', status: 'CONFIRMED', paymentChoice: 'CASH', bucket: 'BOOKED',
        subtotalCents: 12000, bookedCents: 12000, cancelledCents: 0, cashDueCents: 12000, cashCollectedCents: 0, cashRemainingCents: 12000, onlineStatus: 'NONE', onlineAmountCents: 0,
      }],
      page: 1, pageSize: 25, totalRows: 1, totalPages: 1,
    }
    const csv = createFinanceCsv(model as any)
    const lines = csv.trim().split('\r\n')
    expect(lines[0]).toContain('Order ID')
    expect(lines[1]).toContain("'=cmd")
    expect(lines[1]).not.toMatch(/[^']=cmd/)
    expect(lines[1]).toMatch(/"[^"]*""[^"]*"/)
  })
})
