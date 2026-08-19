import { describe, expect, it, vi } from 'vitest'
import { loadBusinessOverviewFacts, saintLuciaDayBounds } from '@/modules/dashboard/business-overview'

const now = new Date('2026-08-19T14:00:00.000Z')
const staffContext = { business: { id: 'business-1', name: 'Island Glow', status: 'PUBLISHED' }, membership: { id: 'staff-membership', role: 'STAFF' as const }, availableLocations: [{ id: 'assigned-location', name: 'Castries', timezone: 'America/St_Lucia' }] }
const accountsContext = { ...staffContext, membership: { id: 'accounts-membership', role: 'ACCOUNTS' as const } }
const ownerContext = { ...staffContext, membership: { id: 'owner-membership', role: 'OWNER' as const } }
const managerContext = { ...staffContext, membership: { id: 'manager-membership', role: 'MANAGER' as const } }

function repository() {
  return {
    bookingSegment: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(null), groupBy: vi.fn().mockResolvedValue([]) },
    businessMembership: { count: vi.fn().mockResolvedValue(0) },
    businessInvitation: { findMany: vi.fn().mockResolvedValue([]) },
    staffTimeOff: { findMany: vi.fn().mockResolvedValue([]) },
    bookingOrder: { aggregate: vi.fn().mockResolvedValue({ _sum: { subtotalCents: 0, dueAtAppointmentCents: 0, dueOnlineCents: 0 }, _count: 0 }), findMany: vi.fn().mockResolvedValue([]) },
    cashCollection: { aggregate: vi.fn().mockResolvedValue({ _sum: { amountCents: 0 } }) },
    location: { findMany: vi.fn().mockResolvedValue([]) },
    serviceOffering: { findMany: vi.fn().mockResolvedValue([]) },
  }
}

describe('business overview repository predicates', () => {
  it('limits every staff booking and time-off query to the current membership and authorized locations', async () => {
    const db = repository()
    await loadBusinessOverviewFacts(staffContext, now, db)

    expect(db.bookingSegment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ membershipId: 'staff-membership', locationId: { in: ['assigned-location'] } }), take: 6 }))
    expect(db.bookingSegment.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ membershipId: 'staff-membership', locationId: { in: ['assigned-location'] } }) }))
    expect(db.staffTimeOff.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ membershipId: 'staff-membership', locationId: { in: ['assigned-location'] } }), take: 3 }))
  })

  it('requires every accounts order segment to be authorized and scopes selected preview segments', async () => {
    const db = repository()
    await loadBusinessOverviewFacts(accountsContext, now, db)

    const aggregateCall = db.bookingOrder.aggregate.mock.calls[0]?.[0]
    expect(aggregateCall.where.status.in).not.toContain('PARTIALLY_CANCELLED')
    expect(aggregateCall.where.Segments.some.locationId).toEqual({ in: ['assigned-location'] })
    expect(aggregateCall.where.Segments.none.OR).toEqual(expect.arrayContaining([expect.objectContaining({ locationId: { notIn: ['assigned-location'] } })]))
    expect(db.bookingOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 6, select: expect.objectContaining({ Segments: expect.objectContaining({ where: expect.objectContaining({ locationId: { in: ['assigned-location'] } }) }) }) }))
  })

  it('uses counts and bounded agenda previews for operations metrics', async () => {
    const db = repository()
    await loadBusinessOverviewFacts(ownerContext, now, db)

    expect(db.bookingSegment.count).toHaveBeenCalled()
    expect(db.bookingSegment.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 6 }))
    expect(db.businessInvitation.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { businessId: 'business-1', acceptedAt: null, revokedAt: null, expiresAt: { gt: now } }, select: { id: true, expiresAt: true } }))
  })

  it('limits Manager invitation alerts to Staff invitations inside assigned locations', async () => {
    const db = repository()
    await loadBusinessOverviewFacts(managerContext, now, db)

    expect(db.businessInvitation.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ businessId: 'business-1', role: 'STAFF', Locations: { none: { locationId: { notIn: ['assigned-location'] } } } }) }))
  })

  it('converts Saint Lucia midnight boundaries to UTC without including either neighboring local day', () => {
    expect(saintLuciaDayBounds(new Date('2026-08-20T03:59:59.999Z'))).toEqual({ start: new Date('2026-08-19T04:00:00.000Z'), end: new Date('2026-08-20T04:00:00.000Z') })
    expect(saintLuciaDayBounds(new Date('2026-08-20T04:00:00.000Z'))).toEqual({ start: new Date('2026-08-20T04:00:00.000Z'), end: new Date('2026-08-21T04:00:00.000Z') })
  })

  it('requires every finance segment to be in the selected local day before order-level values are aggregated', async () => {
    const db = repository()
    await loadBusinessOverviewFacts(accountsContext, now, db)

    const aggregateCall = db.bookingOrder.aggregate.mock.calls[0]?.[0]
    expect(aggregateCall.where.Segments.none).toEqual(expect.objectContaining({ OR: expect.arrayContaining([expect.objectContaining({ startsAt: { lt: new Date('2026-08-19T04:00:00.000Z') } }), expect.objectContaining({ startsAt: { gte: new Date('2026-08-20T04:00:00.000Z') } })]) }))
  })

  it('sums cash collected from append-only CashCollection evidence scoped to the business, authorized locations, and local day', async () => {
    const db = repository()
    await loadBusinessOverviewFacts(accountsContext, now, db)

    expect(db.cashCollection.aggregate).toHaveBeenCalledWith({
      where: { businessId: 'business-1', locationId: { in: ['assigned-location'] }, createdAt: { gte: new Date('2026-08-19T04:00:00.000Z'), lt: new Date('2026-08-20T04:00:00.000Z') } },
      _sum: { amountCents: true },
    })
  })
})
