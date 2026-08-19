import { describe, expect, it } from 'vitest'

import { buildAccountHub } from '@/modules/profile/account-hub'

const now = new Date('2026-08-19T14:00:00.000Z')

const customerOrder = {
  id: 'order-new',
  status: 'CONFIRMED',
  subtotalCents: 12000,
  paidCents: 0,
  dueOnlineCents: 0,
  dueAtAppointmentCents: 12000,
  createdAt: new Date('2026-08-19T13:00:00.000Z'),
  business: { id: 'business-1', name: 'Island Glow', slug: 'island-glow' },
  PaymentRequest: null,
  Segments: [{
    id: 'segment-new',
    status: 'CONFIRMED',
    startsAt: new Date('2026-08-20T14:00:00.000Z'),
    offering: { name: 'Glow facial' },
    location: { id: 'location-1', name: 'Castries', timezone: 'America/St_Lucia' },
    membership: { id: 'staff-1', user: { name: 'Amara' } },
  }],
}

describe('buildAccountHub', () => {
  it('uses canonical orders for customer stats and the next appointment', () => {
    const hub = buildAccountHub({
      now,
      user: { id: 'customer-1', name: 'Darnell', email: 'd@example.test', points: 4, role: 'USER' },
      memberships: [],
      customerOrders: [customerOrder],
      businessOrders: [],
    })

    expect(hub.customer.stats).toEqual({ total: 1, completed: 0, upcoming: 1, spentCents: 0 })
    expect(hub.customer.nextAppointment).toMatchObject({
      orderId: 'order-new',
      serviceName: 'Glow facial',
      businessName: 'Island Glow',
      locationName: 'Castries',
      professionalName: 'Amara',
    })
    expect(hub.customer.recentOrders[0]?.id).toBe('order-new')
  })

  it('builds clear role-aware workspaces for every active membership', () => {
    const hub = buildAccountHub({
      now,
      user: { id: 'operator-1', name: 'Morgan', email: 'm@example.test', points: 0, role: 'EMPLOYEE' },
      memberships: [
        { id: 'owner-member', role: 'OWNER', locationIds: ['location-1'], business: { id: 'business-1', name: 'Island Glow', slug: 'island-glow', status: 'PUBLISHED', activeTeamCount: 5 } },
        { id: 'staff-member', role: 'STAFF', locationIds: ['location-2'], business: { id: 'business-2', name: 'Harbour Wellness', slug: 'harbour-wellness', status: 'PUBLISHED', activeTeamCount: 3 } },
        { id: 'accounts-member', role: 'ACCOUNTS', locationIds: ['location-3'], business: { id: 'business-3', name: 'Soufriere Spa', slug: 'soufriere-spa', status: 'PUBLISHED', activeTeamCount: 2 } },
      ],
      customerOrders: [],
      businessOrders: [
        { ...customerOrder, businessId: 'business-1', status: 'REQUESTED', paidCents: 4000, Segments: [{ ...customerOrder.Segments[0], status: 'REQUESTED', startsAt: new Date('2026-08-19T15:00:00.000Z') }] },
        { ...customerOrder, id: 'accounts-order', businessId: 'business-3', paidCents: 6000, dueAtAppointmentCents: 6000, Segments: [{ ...customerOrder.Segments[0], location: { ...customerOrder.Segments[0].location, id: 'location-3' } }] },
        { ...customerOrder, id: 'outside-accounts-scope', businessId: 'business-3', paidCents: 9000, dueAtAppointmentCents: 9000, Segments: [{ ...customerOrder.Segments[0], location: { ...customerOrder.Segments[0].location, id: 'location-4' } }] },
      ],
    })

    expect(hub.workspaces.map((workspace) => [workspace.role, workspace.primaryHref])).toEqual([
      ['OWNER', '/business/calendar'],
      ['STAFF', '/business/schedule'],
      ['ACCOUNTS', '/business/finance'],
    ])
    expect(hub.workspaces[0]).toMatchObject({ todayAppointments: 1, pendingApprovals: 1, activeTeamCount: 5 })
    expect(hub.workspaces[1]).toMatchObject({ assignedToday: 0, assignedUpcoming: 0 })
    expect(hub.workspaces[2]).toMatchObject({ recordedPaidCents: 6000, dueAtAppointmentCents: 6000 })
  })

  it('adds a platform workspace for administrators without hiding customer bookings', () => {
    const hub = buildAccountHub({
      now,
      user: { id: 'admin-1', name: 'Admin', email: 'admin@example.test', points: 0, role: 'ADMIN' },
      memberships: [],
      customerOrders: [customerOrder],
      businessOrders: [],
      platformSummary: { businesses: 6, applicationsAwaitingReview: 2 },
    })

    expect(hub.platformWorkspace).toEqual({ businesses: 6, applicationsAwaitingReview: 2, href: '/admin' })
    expect(hub.customer.stats.total).toBe(1)
  })
})
