import { describe, expect, it, vi } from 'vitest'

import { getCustomerOrder } from '@/modules/bookings/repository'
import { canCustomerReschedule } from '@/modules/bookings/policies'

describe('customer booking access', () => {
  it('denies a different customer order identifier', async () => {
    const findFirst = vi.fn().mockResolvedValue(null)

    await expect(getCustomerOrder(
      { orderId: 'order-2', customerId: 'customer-1' },
      { findFirst },
    )).rejects.toMatchObject({ code: 'NOT_FOUND' })

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'order-2', customerId: 'customer-1' },
    }))
  })

  it('returns an order only through the customer-scoped query', async () => {
    const order = { id: 'order-1', customerId: 'customer-1' }
    const findFirst = vi.fn().mockResolvedValue(order)

    await expect(getCustomerOrder(
      { orderId: 'order-1', customerId: 'customer-1' },
      { findFirst },
    )).resolves.toBe(order)
  })

  it('allows rescheduling only for active segments outside the lead window', () => {
    const startsAt = new Date('2026-08-20T14:00:00.000Z')

    expect(canCustomerReschedule({ status: 'CONFIRMED', startsAt, now: new Date('2026-08-20T12:00:00.000Z'), leadMinutes: 60 })).toBe(true)
    expect(canCustomerReschedule({ status: 'CONFIRMED', startsAt, now: new Date('2026-08-20T13:30:00.000Z'), leadMinutes: 60 })).toBe(false)
    expect(canCustomerReschedule({ status: 'COMPLETED', startsAt, now: new Date('2026-08-19T12:00:00.000Z'), leadMinutes: 60 })).toBe(false)
  })
})
