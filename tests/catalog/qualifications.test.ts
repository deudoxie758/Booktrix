import { describe, expect, it } from 'vitest'

import { isStaffEligible } from '@/modules/catalog/qualifications'

describe('staff qualifications', () => {
  it('requires active membership, location assignment, and qualification', () => {
    expect(
      isStaffEligible({
        membershipId: 'member-1',
        offeringId: 'offering-1',
        locationId: 'location-1',
        activeMembershipIds: ['member-1'],
        assignedLocationIds: ['location-1'],
        qualifications: [
          { membershipId: 'member-1', offeringId: 'offering-1', locationId: 'location-1', active: true },
        ],
      }),
    ).toBe(true)
  })

  it('rejects a qualification at another location', () => {
    expect(
      isStaffEligible({
        membershipId: 'member-1',
        offeringId: 'offering-1',
        locationId: 'location-1',
        activeMembershipIds: ['member-1'],
        assignedLocationIds: ['location-1'],
        qualifications: [
          { membershipId: 'member-1', offeringId: 'offering-1', locationId: 'location-2', active: true },
        ],
      }),
    ).toBe(false)
  })
})
