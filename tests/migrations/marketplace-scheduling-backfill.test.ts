import { describe, expect, it } from 'vitest'

import { planMarketplaceSchedulingBackfill } from '@/modules/bookings/legacy-backfill'

describe('marketplace and scheduling legacy backfill', () => {
  it('maps a legacy subservice and booking without losing identifiers', () => {
    const plan = planMarketplaceSchedulingBackfill({
      businesses: [{ id: 'biz-1', legacySpaId: 'spa-1' }],
      locations: [{ id: 'loc-1', businessId: 'biz-1' }],
      subservices: [
        {
          id: 'sub-1',
          spaId: 'spa-1',
          serviceId: 'category-1',
          name: 'Massage',
          description: 'A restorative massage.',
          durationMin: 60,
          priceCents: 12000,
          active: true,
        },
      ],
      bookings: [
        {
          id: 'old-1',
          spaId: 'spa-1',
          subserviceId: 'sub-1',
          userId: 'customer-1',
          employeeId: null,
          start: new Date('2026-08-20T14:00:00.000Z'),
          end: new Date('2026-08-20T15:00:00.000Z'),
          status: 'CONFIRMED',
          paymentMethod: 'CASH',
          paymentStatus: 'UNPAID',
          totalCents: 12000,
          paidCents: 0,
          customerName: null,
          customerEmail: null,
          customerPhone: null,
        },
      ],
    })

    expect(plan.offerings[0]).toMatchObject({
      businessId: 'biz-1',
      legacySubserviceId: 'sub-1',
      name: 'Massage',
    })
    expect(plan.serviceLocations[0]).toMatchObject({ locationId: 'loc-1' })
    expect(plan.orders[0]).toMatchObject({
      businessId: 'biz-1',
      legacyBookingId: 'old-1',
      customerId: 'customer-1',
    })
    expect(plan.segments[0]).toMatchObject({
      legacyBookingId: 'old-1',
      offeringLegacyId: 'sub-1',
      locationId: 'loc-1',
    })
  })

  it('skips orphaned legacy records and reports why', () => {
    const plan = planMarketplaceSchedulingBackfill({
      businesses: [],
      locations: [],
      subservices: [
        {
          id: 'orphan-service',
          spaId: 'missing-spa',
          serviceId: 'category-1',
          name: 'Orphan',
          description: null,
          durationMin: 30,
          priceCents: 5000,
          active: true,
        },
      ],
      bookings: [],
    })

    expect(plan.offerings).toEqual([])
    expect(plan.skipped).toEqual([
      { legacyId: 'orphan-service', kind: 'subservice', reason: 'BUSINESS_NOT_FOUND' },
    ])
  })
})
