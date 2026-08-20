import { describe, expect, it } from 'vitest'

import { createBookingOrder, type BookingOrderStore } from '@/modules/bookings/orders'

const hold = {
  token: 'hold-1',
  idempotencyKey: 'hold-request',
  businessId: 'business-1',
  customerId: 'customer-1',
  checkoutIdentity: 'browser-1',
  expiresAt: new Date('2026-08-20T13:10:00.000Z'),
  consumedAt: null,
  segments: [
    { offeringId: 'automatic', locationId: 'location-1', membershipId: 'member-1', start: new Date('2026-08-20T14:00:00.000Z'), end: new Date('2026-08-20T14:30:00.000Z'), occupiedStart: new Date('2026-08-20T14:00:00.000Z'), occupiedEnd: new Date('2026-08-20T14:30:00.000Z'), attendeeCount: 1, capacity: 1, priceCents: 5000 },
    { offeringId: 'manual', locationId: 'location-1', membershipId: 'member-1', start: new Date('2026-08-20T14:30:00.000Z'), end: new Date('2026-08-20T15:00:00.000Z'), occupiedStart: new Date('2026-08-20T14:30:00.000Z'), occupiedEnd: new Date('2026-08-20T15:00:00.000Z'), attendeeCount: 1, capacity: 1, priceCents: 7000 },
  ],
}

function memoryOrderStore(): BookingOrderStore {
  const orders = new Map<string, any>()
  const store: BookingOrderStore = {
    transaction: (work) => work(store),
    findByIdempotencyKey: async (key) => orders.get(key) ?? null,
    getActiveHold: async () => hold,
    acquireHoldLock: async () => undefined,
    getOfferings: async () => [
      { id: 'automatic', confirmationMode: 'AUTOMATIC', allowFullPayment: true, allowDeposit: false, allowCash: true, depositKind: null, depositValue: null },
      { id: 'manual', confirmationMode: 'MANUAL', allowFullPayment: true, allowDeposit: false, allowCash: true, depositKind: null, depositValue: null },
    ],
    revalidateHold: async () => undefined,
    create: async (input) => {
      const created = { id: 'order-1', ...input }
      orders.set(input.idempotencyKey, created)
      return created
    },
    consumeHoldIfActive: async () => true,
  }
  return store
}

describe('booking orders', () => {
  it('creates confirmed and requested segments from mixed confirmation modes', async () => {
    const order = await createBookingOrder({ holdToken: 'hold-1', customerId: 'customer-1', idempotencyKey: 'order-request', paymentChoice: 'CASH' }, { store: memoryOrderStore(), now: () => new Date('2026-08-20T13:00:00.000Z') })
    expect(order.status).toBe('REQUESTED')
    expect(order.segments.map((segment: any) => segment.status)).toEqual(['CONFIRMED', 'REQUESTED'])
    expect(order).toMatchObject({ subtotalCents: 12000, dueOnlineCents: 0, dueAtAppointmentCents: 12000 })
  })

  const now = () => new Date('2026-08-20T13:00:00.000Z')

  it('returns the original order for a repeated idempotency key', async () => {
    const store = memoryOrderStore()
    const input = { holdToken: 'hold-1', customerId: 'customer-1', idempotencyKey: 'same', paymentChoice: 'CASH' as const }
    const first = await createBookingOrder(input, { store, now })
    const second = await createBookingOrder(input, { store, now })
    expect(second.id).toBe(first.id)
  })

  it('rejects an idempotency key reused by another customer, hold, or payment choice', async () => {
    const store = memoryOrderStore()
    await createBookingOrder({ holdToken: 'hold-1', customerId: 'customer-1', idempotencyKey: 'owned', paymentChoice: 'CASH' }, { store, now })
    await expect(createBookingOrder({ holdToken: 'other-hold', customerId: 'customer-2', idempotencyKey: 'owned', paymentChoice: 'FULL' }, { store, now }))
      .rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' })
  })

  it('rolls back when the hold was already conditionally consumed', async () => {
    const store = memoryOrderStore()
    store.consumeHoldIfActive = async () => false
    await expect(createBookingOrder({ holdToken: 'hold-1', customerId: 'customer-1', idempotencyKey: 'consumed', paymentChoice: 'CASH' }, { store, now }))
      .rejects.toMatchObject({ code: 'HOLD_EXPIRED' })
  })

  it('allows only one concurrent order to conditionally consume a hold', async () => {
    const store = memoryOrderStore()
    let active = true
    store.consumeHoldIfActive = async () => {
      if (!active) return false
      active = false
      return true
    }
    const results = await Promise.allSettled([
      createBookingOrder({ holdToken: 'hold-1', customerId: 'customer-1', idempotencyKey: 'concurrent-one', paymentChoice: 'CASH' }, { store, now }),
      createBookingOrder({ holdToken: 'hold-1', customerId: 'customer-1', idempotencyKey: 'concurrent-two', paymentChoice: 'CASH' }, { store, now }),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({ reason: { code: 'HOLD_EXPIRED' } })
  })

  it('revalidates scheduling before consuming the hold', async () => {
    const store = memoryOrderStore()
    store.revalidateHold = async () => { throw Object.assign(new Error('SLOT_UNAVAILABLE'), { code: 'SLOT_UNAVAILABLE' }) }
    await expect(createBookingOrder(
      { holdToken: 'hold-1', customerId: 'customer-1', idempotencyKey: 'revalidate', paymentChoice: 'CASH' },
      { store, now: () => new Date('2026-08-20T13:00:00.000Z') },
    )).rejects.toMatchObject({ code: 'SLOT_UNAVAILABLE' })
    expect(await store.findByIdempotencyKey('revalidate')).toBeNull()
  })

  it('creates a provider-neutral pending request for online payment', async () => {
    const store = memoryOrderStore()
    const order = await createBookingOrder(
      { holdToken: 'hold-1', customerId: 'customer-1', idempotencyKey: 'online', paymentChoice: 'FULL' },
      { store, now: () => new Date('2026-08-20T13:00:00.000Z') },
    )
    expect(order).toMatchObject({
      status: 'PAYMENT_PENDING',
      paymentRequest: {
        status: 'PENDING', amountCents: 12000, currency: 'XCD', reference: 'booking:online', provider: null,
      },
    })
  })
})
