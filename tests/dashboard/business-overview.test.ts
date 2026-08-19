import { describe, expect, it } from 'vitest'
import { loadBusinessOverview } from '@/modules/dashboard/business-overview'

const now = new Date('2026-08-19T14:00:00.000Z')

const business = { id: 'business-1', name: 'Island Glow', status: 'PUBLISHED' }
const locations = [{ id: 'assigned-location', name: 'Castries', timezone: 'America/St_Lucia' }]
const todaySegments = [
  { id: 'confirmed', locationId: 'assigned-location', membershipId: 'staff-1', startsAt: new Date('2026-08-19T15:00:00.000Z'), endsAt: new Date('2026-08-19T16:00:00.000Z'), status: 'CONFIRMED', attendeeCount: 1, priceCents: 8000, offeringName: 'Glow facial', offeringCapacity: 1, customerName: 'Kai Joseph' },
  { id: 'requested', locationId: 'assigned-location', membershipId: null, startsAt: new Date('2026-08-19T17:00:00.000Z'), endsAt: new Date('2026-08-19T18:00:00.000Z'), status: 'REQUESTED', attendeeCount: 2, priceCents: 12000, offeringName: 'Couples massage', offeringCapacity: 2, customerName: 'Asha James' },
]

function dependencies(role: 'OWNER' | 'MANAGER' | 'STAFF' | 'ACCOUNTS', extra: Record<string, unknown> = {}) {
  return {
    resolveContext: async () => ({ business, membership: { id: `${role.toLowerCase()}-membership`, role }, availableLocations: locations }),
    loadFacts: async () => ({ todaySegments, nextAssignedSegment: null, upcomingTimeOff: [], financeOrders: [], missingHours: [], unassignedRequestedBookings: 0, servicesMissingQualifiedStaff: [], ...extra }),
  }
}

describe('loadBusinessOverview', () => {
  it('scopes manager overview metrics to assigned locations', async () => {
    const model = await loadBusinessOverview({ actorId: 'manager-1', now }, dependencies('MANAGER'))

    expect(model.role).toBe('MANAGER')
    if (model.role !== 'MANAGER') throw new Error('Expected manager overview')
    expect(model.locationIds).toEqual(['assigned-location'])
    expect(model.todayAppointments).toBe(2)
    expect(model.pendingApprovals).toBe(1)
  })

  it('builds owner operational metrics and canonical operational alerts', async () => {
    const model = await loadBusinessOverview({ actorId: 'owner-1', now }, dependencies('OWNER', {
      missingHours: [{ id: 'assigned-location', name: 'Castries' }],
      unassignedRequestedBookings: 1,
      servicesMissingQualifiedStaff: [{ offeringName: 'Couples massage', locationName: 'Castries' }],
    }))

    expect(model.role).toBe('OWNER')
    if (model.role !== 'OWNER') throw new Error('Expected owner overview')
    expect(model.staffScheduledToday).toBe(1)
    expect(model.locationUtilization).toEqual([{ locationId: 'assigned-location', locationName: 'Castries', scheduledCapacity: 3, bookedCapacity: 3, percentage: 100 }])
    expect(model.alerts.map((alert) => alert.kind)).toEqual(['MISSING_HOURS', 'UNASSIGNED_BOOKING', 'UNQUALIFIED_SERVICE'])
  })

  it('adds a not-yet-published alert for Owners once BusinessPolicy/publication readiness exists, but never for Managers', async () => {
    const unpublishedBusiness = { id: 'business-1', name: 'Island Glow', status: 'SETUP' }
    const ownerModel = await loadBusinessOverview({ actorId: 'owner-1', now }, {
      resolveContext: async () => ({ business: unpublishedBusiness, membership: { id: 'owner-membership', role: 'OWNER' as const }, availableLocations: locations }),
      loadFacts: async () => ({ todaySegments: [], nextAssignedSegment: null, upcomingTimeOff: [], financeOrders: [], missingHours: [], unassignedRequestedBookings: 0, servicesMissingQualifiedStaff: [] }),
    })
    expect(ownerModel.alerts).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'NOT_PUBLISHED' })]))

    const managerModel = await loadBusinessOverview({ actorId: 'manager-1', now }, {
      resolveContext: async () => ({ business: unpublishedBusiness, membership: { id: 'manager-membership', role: 'MANAGER' as const }, availableLocations: locations }),
      loadFacts: async () => ({ todaySegments: [], nextAssignedSegment: null, upcomingTimeOff: [], financeOrders: [], missingHours: [], unassignedRequestedBookings: 0, servicesMissingQualifiedStaff: [] }),
    })
    expect(managerModel.alerts.map((alert) => alert.kind)).not.toContain('NOT_PUBLISHED')
  })

  it('does not surface a not-yet-published alert once the business is live', async () => {
    const model = await loadBusinessOverview({ actorId: 'owner-1', now }, dependencies('OWNER', {}))
    expect(model.alerts.map((alert) => alert.kind)).not.toContain('NOT_PUBLISHED')
  })

  it('adds pending and soon-expiring invitation alerts after invitation persistence exists', async () => {
    const model = await loadBusinessOverview({ actorId: 'owner-1', now }, dependencies('OWNER', {
      pendingInvitations: [
        { id: 'expiring', expiresAt: new Date('2026-08-20T10:00:00.000Z') },
        { id: 'later', expiresAt: new Date('2026-08-25T10:00:00.000Z') },
      ],
    }))

    expect(model.alerts).toEqual(expect.arrayContaining([
      { kind: 'PENDING_INVITATION', message: '2 team invitations are pending.' },
      { kind: 'EXPIRING_INVITATION', message: '1 team invitation expires within 48 hours.' },
    ]))
  })

  it('builds the staff member’s next assignment and upcoming time off', async () => {
    const nextAssignedSegment = { ...todaySegments[0], membershipId: 'staff-membership' }
    const model = await loadBusinessOverview({ actorId: 'staff-1', now }, dependencies('STAFF', {
      todaySegments: [{ ...todaySegments[0], membershipId: 'staff-membership' }],
      nextAssignedSegment,
      upcomingTimeOff: [{ id: 'time-off-1', startsAt: new Date('2026-08-22T13:00:00.000Z'), endsAt: new Date('2026-08-22T17:00:00.000Z'), locationName: 'Castries', reason: 'Personal leave' }],
    }))

    expect(model.role).toBe('STAFF')
    if (model.role !== 'STAFF') throw new Error('Expected staff overview')
    expect(model.nextAppointment?.id).toBe('confirmed')
    expect(model.todaySchedule).toHaveLength(1)
    expect(model.upcomingTimeOff).toEqual([{ id: 'time-off-1', startsAt: new Date('2026-08-22T13:00:00.000Z'), endsAt: new Date('2026-08-22T17:00:00.000Z'), locationName: 'Castries', reason: 'Personal leave' }])
  })

  it('uses scoped canonical finance values, defaulting cash collected to zero when no repository summary is supplied', async () => {
    const model = await loadBusinessOverview({ actorId: 'accounts-1', now }, dependencies('ACCOUNTS', {
      financeOrders: [
        { id: 'scoped-order', status: 'CONFIRMED', subtotalCents: 12000, dueAtAppointmentCents: 9000, dueOnlineCents: 3000, paymentRequest: { status: 'PENDING' }, segments: [{ locationId: 'assigned-location', priceCents: 12000 }] },
        { id: 'cancelled-order', status: 'CANCELLED', subtotalCents: 5000, dueAtAppointmentCents: 5000, dueOnlineCents: 0, paymentRequest: null, segments: [{ locationId: 'assigned-location', priceCents: 5000 }] },
        { id: 'partially-cancelled-order', status: 'PARTIALLY_CANCELLED', subtotalCents: 7000, dueAtAppointmentCents: 7000, dueOnlineCents: 0, paymentRequest: null, segments: [{ locationId: 'assigned-location', priceCents: 7000 }] },
        { id: 'outside-scope-order', status: 'CONFIRMED', subtotalCents: 9000, dueAtAppointmentCents: 9000, dueOnlineCents: 0, paymentRequest: null, segments: [{ locationId: 'other-location', priceCents: 9000 }] },
      ],
    }))

    expect(model.role).toBe('ACCOUNTS')
    if (model.role !== 'ACCOUNTS') throw new Error('Expected accounts overview')
    expect(model.bookedRevenueCents).toBe(12000)
    expect(model.cashCollectedCents).toBe(0)
    expect(model.cashDueAtAppointmentCents).toBe(9000)
    expect(model.pendingOnlinePaymentCents).toBe(3000)
    expect(model.pendingOnlinePaymentRequests).toBe(1)
  })

  it('surfaces real cash collected from append-only CashCollection evidence supplied by the repository', async () => {
    const model = await loadBusinessOverview({ actorId: 'accounts-1', now }, dependencies('ACCOUNTS', {
      financeSummary: { bookedRevenueCents: 12000, cashCollectedCents: 5000, cashDueAtAppointmentCents: 9000, pendingOnlinePaymentCents: 3000, pendingOnlinePaymentRequests: 1 },
    }))

    expect(model.role).toBe('ACCOUNTS')
    if (model.role !== 'ACCOUNTS') throw new Error('Expected accounts overview')
    expect(model.cashCollectedCents).toBe(5000)
    expect(model.bookedRevenueCents).toBe(12000)
    expect(model.cashDueAtAppointmentCents).toBe(9000)
  })
})
