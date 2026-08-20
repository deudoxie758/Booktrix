import { describe, expect, it, vi } from 'vitest'

import { createManagedBooking } from '@/modules/bookings/management'

describe('managed bookings', () => {
  it('rejects a manager operating an unassigned location', async () => {
    const authorizeLocation = vi.fn().mockRejectedValue(Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' }))

    await expect(createManagedBooking({
      businessId: 'business-1', locationId: 'other-location', actorId: 'manager-1',
      customer: { kind: 'WALK_IN', name: 'Kai', phone: '758-555-0100' }, segments: [], override: false,
    }, { authorizeLocation, createFromHold: vi.fn() })).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('uses normal scheduling validation unless an override is authorized', async () => {
    const createFromHold = vi.fn().mockRejectedValue(Object.assign(new Error('SLOT_UNAVAILABLE'), { code: 'SLOT_UNAVAILABLE' }))
    await expect(createManagedBooking({
      businessId: 'business-1', locationId: 'location-1', actorId: 'manager-1',
      customer: { kind: 'WALK_IN', name: 'Kai' },
      segments: [{ offeringId: 'service-1', membershipId: 'member-1', startsAt: new Date('2026-08-20T14:00:00.000Z'), attendeeCount: 1 }],
      override: false,
    }, {
      authorizeLocation: vi.fn().mockResolvedValue({ businessId: 'business-1' }),
      authorizeOverride: vi.fn(),
      createFromHold,
    })).rejects.toMatchObject({ code: 'SLOT_UNAVAILABLE' })
    expect(createFromHold).toHaveBeenCalledWith(expect.anything(), { override: false })
  })

  it('requires override authorization and passes the trimmed reason to audited creation', async () => {
    const authorizeOverride = vi.fn().mockResolvedValue(undefined)
    const createFromHold = vi.fn().mockResolvedValue({ id: 'order-1' })
    await createManagedBooking({
      businessId: 'business-1', locationId: 'location-1', actorId: 'manager-1',
      customer: { kind: 'WALK_IN', name: 'Kai' },
      segments: [{ offeringId: 'service-1', membershipId: 'member-1', startsAt: new Date('2026-08-20T14:00:00.000Z'), attendeeCount: 1 }],
      override: true, overrideReason: '  customer accommodation  ',
    }, {
      authorizeLocation: vi.fn().mockResolvedValue({ businessId: 'business-1' }),
      authorizeOverride,
      createFromHold,
    })
    expect(authorizeOverride).toHaveBeenCalledWith('location-1')
    expect(createFromHold).toHaveBeenCalledWith(expect.anything(), { override: true, overrideReason: 'customer accommodation' })
  })
})
