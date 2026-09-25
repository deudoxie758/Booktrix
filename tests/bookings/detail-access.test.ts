import { describe, expect, it } from 'vitest'

import { bookingDetailScope } from '@/modules/bookings/detail-access'

const segment = (id: string, locationId: string, membershipId: string | null) => ({ id, locationId, membershipId })

describe('booking detail scope', () => {
  it('gives owners all segments and managers only location-authorized orders', () => {
    const segments = [segment('one', 'loc-1', 'staff-1'), segment('two', 'loc-1', 'staff-2')]
    expect(bookingDetailScope({ role: 'OWNER', membershipId: 'owner', locationIds: [] }, segments)).toEqual({ allowed: true, segmentIds: ['one', 'two'] })
    expect(bookingDetailScope({ role: 'MANAGER', membershipId: 'manager', locationIds: ['loc-1'] }, segments)).toEqual({ allowed: true, segmentIds: ['one', 'two'] })
    expect(bookingDetailScope({ role: 'MANAGER', membershipId: 'manager', locationIds: ['loc-2'] }, segments).allowed).toBe(false)
  })

  it('limits staff to their own assigned segments and denies accounts users', () => {
    const segments = [segment('mine', 'loc-1', 'staff-1'), segment('other', 'loc-1', 'staff-2')]
    expect(bookingDetailScope({ role: 'STAFF', membershipId: 'staff-1', locationIds: ['loc-1'] }, segments)).toEqual({ allowed: true, segmentIds: ['mine'] })
    expect(bookingDetailScope({ role: 'STAFF', membershipId: 'staff-3', locationIds: ['loc-1'] }, segments).allowed).toBe(false)
    expect(bookingDetailScope({ role: 'ACCOUNTS', membershipId: 'accounts', locationIds: ['loc-1'] }, segments).allowed).toBe(false)
  })
})
