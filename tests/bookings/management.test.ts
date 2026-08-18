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
})
