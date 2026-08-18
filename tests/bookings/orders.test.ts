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
    consumeHold: async () => undefined,
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

  it('returns the original order for a repeated idempotency key', async () => {
    const store = memoryOrderStore()
    const input = { holdToken: 'hold-1', customerId: 'customer-1', idempotencyKey: 'same', paymentChoice: 'CASH' as const }
    const first = await createBookingOrder(input, { store })
    const second = await createBookingOrder(input, { store })
    expect(second.id).toBe(first.id)
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
