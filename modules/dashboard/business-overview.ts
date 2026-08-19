import type { BusinessRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { resolveBusinessContext } from '@/modules/organizations/context'

const ACTIVE_SEGMENT_STATUSES = ['REQUESTED', 'CONFIRMED', 'IN_PROGRESS']
const BOOKED_ORDER_STATUSES = ['PAYMENT_PENDING', 'REQUESTED', 'CONFIRMED', 'COMPLETED']
const AGENDA_PREVIEW_LIMIT = 6
const TIME_OFF_PREVIEW_LIMIT = 3

type OverviewLocation = { id: string; name: string; timezone: string }
type OverviewSegment = { id: string; locationId: string; membershipId: string | null; startsAt: Date; endsAt: Date; status: string; attendeeCount: number; priceCents: number; offeringName: string; offeringCapacity: number; customerName: string }
type OverviewFinanceOrder = { id: string; status: string; subtotalCents: number; dueAtAppointmentCents: number; dueOnlineCents: number; paymentRequest: { status: string } | null; segments: Array<{ locationId: string; priceCents: number }> }
type OverviewFacts = {
  todaySegments: OverviewSegment[]
  nextAssignedSegment: OverviewSegment | null
  upcomingTimeOff: Array<{ id: string; startsAt: Date; endsAt: Date; locationName: string; reason: string | null }>
  financeOrders: OverviewFinanceOrder[]
  missingHours: Array<{ id: string; name: string }>
  unassignedRequestedBookings: number
  servicesMissingQualifiedStaff: Array<{ offeringName: string; locationName: string }>
  pendingInvitations?: Array<{ id: string; expiresAt: Date }>
  operations?: { todayAppointments: number; pendingApprovals: number; staffScheduledToday: number; locationUtilization: Array<{ locationId: string; locationName: string; scheduledCapacity: number; bookedCapacity: number; percentage: number }> }
  financeSummary?: { bookedRevenueCents: number; cashDueAtAppointmentCents: number; pendingOnlinePaymentCents: number; pendingOnlinePaymentRequests: number }
}
export type BusinessOverviewContext = { business: { id: string; name: string; status: string }; membership: { id: string; role: BusinessRole }; availableLocations: OverviewLocation[] }

export type OverviewAlert = { kind: 'MISSING_HOURS' | 'UNASSIGNED_BOOKING' | 'UNQUALIFIED_SERVICE' | 'PENDING_INVITATION' | 'EXPIRING_INVITATION'; message: string }
type OverviewCommon = { business: { id: string; name: string; status: string }; locations: OverviewLocation[]; locationIds: string[]; alerts: OverviewAlert[] }
type OverviewAgendaItem = Pick<OverviewSegment, 'id' | 'startsAt' | 'endsAt' | 'status' | 'offeringName' | 'customerName'> & { locationName: string }
type OperationsOverview = OverviewCommon & { role: 'OWNER' | 'MANAGER'; todayAppointments: number; pendingApprovals: number; staffScheduledToday: number; locationUtilization: Array<{ locationId: string; locationName: string; scheduledCapacity: number; bookedCapacity: number; percentage: number }>; agenda: OverviewAgendaItem[] }
type StaffOverview = OverviewCommon & { role: 'STAFF'; nextAppointment: OverviewAgendaItem | null; todaySchedule: OverviewAgendaItem[]; upcomingTimeOff: OverviewFacts['upcomingTimeOff'] }
type AccountsOverview = OverviewCommon & { role: 'ACCOUNTS'; bookedRevenueCents: number; cashCollectedCents: number; cashDueAtAppointmentCents: number; pendingOnlinePaymentCents: number; pendingOnlinePaymentRequests: number; recentTransactions: Array<{ id: string; amountCents: number; cashDueCents: number; pendingOnlineCents: number }> }
export type BusinessOverviewModel = OperationsOverview | StaffOverview | AccountsOverview

type Dependencies = { resolveContext(actorId: string): Promise<BusinessOverviewContext>; loadFacts(context: BusinessOverviewContext, now: Date): Promise<OverviewFacts> }

export function saintLuciaDayBounds(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/St_Lucia', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value)
  const start = new Date(Date.UTC(value('year'), value('month') - 1, value('day'), 4))
  return { start, end: new Date(start.getTime() + 86_400_000) }
}

function mapSegment(segment: any): OverviewSegment {
  return { id: segment.id, locationId: segment.locationId, membershipId: segment.membershipId, startsAt: segment.startsAt, endsAt: segment.endsAt, status: segment.status, attendeeCount: segment.attendeeCount, priceCents: segment.priceCents, offeringName: segment.offering.name, offeringCapacity: segment.offering.capacity, customerName: segment.order.customer?.name ?? segment.order.customerName ?? 'Walk-in customer' }
}

function mapFinanceOrder(order: any): OverviewFinanceOrder {
  return { id: order.id, status: order.status, subtotalCents: order.subtotalCents, dueAtAppointmentCents: order.dueAtAppointmentCents, dueOnlineCents: order.dueOnlineCents, paymentRequest: order.PaymentRequest, segments: order.Segments }
}

function operationalAlertsQueries(context: BusinessOverviewContext, db: any, locationIds: string[], now: Date) {
  const enabled = context.membership.role === 'OWNER' || context.membership.role === 'MANAGER'
  return [
    enabled ? db.location.findMany({ where: { id: { in: locationIds }, Hours: { none: {} } }, select: { id: true, name: true } }) : Promise.resolve([]),
    enabled ? db.bookingSegment.count({ where: { locationId: { in: locationIds }, status: 'REQUESTED', membershipId: null } }) : Promise.resolve(0),
    enabled ? db.serviceOffering.findMany({ where: { businessId: context.business.id, active: true, Locations: { some: { locationId: { in: locationIds }, active: true } } }, select: { name: true, Locations: { where: { locationId: { in: locationIds }, active: true }, select: { locationId: true, location: { select: { name: true } } } }, Qualifications: { where: { active: true, membership: { active: true, role: 'STAFF' } }, select: { locationId: true } } } }) : Promise.resolve([]),
    enabled ? db.businessInvitation.findMany({ where: { businessId: context.business.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: now }, ...(context.membership.role === 'MANAGER' ? { role: 'STAFF', Locations: { none: { locationId: { notIn: locationIds } } } } : {}) }, select: { id: true, expiresAt: true } }) : Promise.resolve([]),
  ] as const
}

async function loadOperationsFacts(context: BusinessOverviewContext, db: any, locationIds: string[], start: Date, end: Date, now: Date): Promise<Partial<OverviewFacts>> {
  const dailyActive = { locationId: { in: locationIds }, startsAt: { gte: start, lt: end }, status: { in: ACTIVE_SEGMENT_STATUSES } }
  const [todayAppointments, pendingApprovals, staffScheduledToday, agendaRecords, groupedCapacity, missingHours, unassignedRequestedBookings, offerings, pendingInvitations] = await Promise.all([
    db.bookingSegment.count({ where: dailyActive }),
    db.bookingSegment.count({ where: { ...dailyActive, status: 'REQUESTED' } }),
    db.businessMembership.count({ where: { businessId: context.business.id, active: true, role: 'STAFF', BookingSegments: { some: dailyActive } } }),
    db.bookingSegment.findMany({ where: dailyActive, select: { id: true, locationId: true, membershipId: true, startsAt: true, endsAt: true, status: true, attendeeCount: true, priceCents: true, offering: { select: { name: true, capacity: true } }, order: { select: { customerName: true, customer: { select: { name: true } } } } }, orderBy: { startsAt: 'asc' }, take: AGENDA_PREVIEW_LIMIT }),
    db.bookingSegment.groupBy({ by: ['locationId', 'offeringId'], where: dailyActive, _count: { _all: true }, _sum: { attendeeCount: true } }),
    ...operationalAlertsQueries(context, db, locationIds, now),
  ])
  const offeringIds = groupedCapacity.map((item: any) => item.offeringId)
  const capacities = offeringIds.length ? await db.serviceOffering.findMany({ where: { id: { in: offeringIds } }, select: { id: true, capacity: true } }) : []
  const capacityByOffering = new Map<string, number>(capacities.map((offering: any) => [offering.id, offering.capacity]))
  const locationUtilization = context.availableLocations.map((location) => {
    const groups = groupedCapacity.filter((item: any) => item.locationId === location.id)
    const scheduledCapacity = groups.reduce((total: number, item: any) => total + item._count._all * (capacityByOffering.get(item.offeringId) ?? 0), 0)
    const bookedCapacity = groups.reduce((total: number, item: any) => total + (item._sum.attendeeCount ?? 0), 0)
    return { locationId: location.id, locationName: location.name, scheduledCapacity, bookedCapacity, percentage: scheduledCapacity ? Math.round((bookedCapacity / scheduledCapacity) * 100) : 0 }
  })
  return { todaySegments: agendaRecords.map(mapSegment), missingHours, unassignedRequestedBookings, servicesMissingQualifiedStaff: offerings.flatMap((offering: any) => offering.Locations.filter((location: any) => !offering.Qualifications.some((qualification: any) => qualification.locationId === location.locationId)).map((location: any) => ({ offeringName: offering.name, locationName: location.location.name }))), pendingInvitations, operations: { todayAppointments, pendingApprovals, staffScheduledToday, locationUtilization } }
}

async function loadStaffFacts(context: BusinessOverviewContext, db: any, locationIds: string[], start: Date, end: Date, now: Date): Promise<OverviewFacts> {
  const scopedAssignment = { membershipId: context.membership.id, locationId: { in: locationIds } }
  const [todaySchedule, nextAssignedSegment, upcomingTimeOff] = await Promise.all([
    db.bookingSegment.findMany({ where: { ...scopedAssignment, startsAt: { gte: start, lt: end }, status: { in: ACTIVE_SEGMENT_STATUSES } }, select: { id: true, locationId: true, membershipId: true, startsAt: true, endsAt: true, status: true, attendeeCount: true, priceCents: true, offering: { select: { name: true, capacity: true } }, order: { select: { customerName: true, customer: { select: { name: true } } } }, }, orderBy: { startsAt: 'asc' }, take: AGENDA_PREVIEW_LIMIT }),
    db.bookingSegment.findFirst({ where: { ...scopedAssignment, startsAt: { gte: now }, status: { in: ACTIVE_SEGMENT_STATUSES } }, select: { id: true, locationId: true, membershipId: true, startsAt: true, endsAt: true, status: true, attendeeCount: true, priceCents: true, offering: { select: { name: true, capacity: true } }, order: { select: { customerName: true, customer: { select: { name: true } } } }, }, orderBy: { startsAt: 'asc' } }),
    db.staffTimeOff.findMany({ where: { ...scopedAssignment, endsAt: { gte: now } }, select: { id: true, startsAt: true, endsAt: true, reason: true, location: { select: { name: true } } }, orderBy: { startsAt: 'asc' }, take: TIME_OFF_PREVIEW_LIMIT }),
  ])
  return { todaySegments: todaySchedule.map(mapSegment), nextAssignedSegment: nextAssignedSegment ? mapSegment(nextAssignedSegment) : null, upcomingTimeOff: upcomingTimeOff.map((timeOff: any) => ({ id: timeOff.id, startsAt: timeOff.startsAt, endsAt: timeOff.endsAt, locationName: timeOff.location.name, reason: timeOff.reason })), financeOrders: [], missingHours: [], unassignedRequestedBookings: 0, servicesMissingQualifiedStaff: [], pendingInvitations: [] }
}

async function loadAccountsFacts(context: BusinessOverviewContext, db: any, locationIds: string[], start: Date, end: Date): Promise<OverviewFacts> {
  const financeSegments = { some: { locationId: { in: locationIds }, startsAt: { gte: start, lt: end } }, none: { OR: [{ locationId: { notIn: locationIds } }, { startsAt: { lt: start } }, { startsAt: { gte: end } }] } }
  const eligibleOrders = { businessId: context.business.id, status: { in: BOOKED_ORDER_STATUSES }, Segments: financeSegments }
  const [totals, pending, preview] = await Promise.all([
    db.bookingOrder.aggregate({ where: eligibleOrders, _sum: { subtotalCents: true, dueAtAppointmentCents: true }, _count: { id: true } }),
    db.bookingOrder.aggregate({ where: { ...eligibleOrders, PaymentRequest: { is: { status: 'PENDING' } } }, _sum: { dueOnlineCents: true }, _count: { id: true } }),
    db.bookingOrder.findMany({ where: eligibleOrders, select: { id: true, status: true, subtotalCents: true, dueAtAppointmentCents: true, dueOnlineCents: true, PaymentRequest: { select: { status: true } }, Segments: { where: { locationId: { in: locationIds }, startsAt: { gte: start, lt: end } }, select: { locationId: true, priceCents: true } } }, orderBy: { createdAt: 'desc' }, take: AGENDA_PREVIEW_LIMIT }),
  ])
  return { todaySegments: [], nextAssignedSegment: null, upcomingTimeOff: [], financeOrders: preview.map(mapFinanceOrder), missingHours: [], unassignedRequestedBookings: 0, servicesMissingQualifiedStaff: [], pendingInvitations: [], financeSummary: { bookedRevenueCents: totals._sum.subtotalCents ?? 0, cashDueAtAppointmentCents: totals._sum.dueAtAppointmentCents ?? 0, pendingOnlinePaymentCents: pending._sum.dueOnlineCents ?? 0, pendingOnlinePaymentRequests: typeof pending._count === 'number' ? pending._count : pending._count.id } }
}

export async function loadBusinessOverviewFacts(context: BusinessOverviewContext, now: Date, db: any = prisma): Promise<OverviewFacts> {
  const locationIds = context.availableLocations.map((location) => location.id)
  const { start, end } = saintLuciaDayBounds(now)
  if (context.membership.role === 'STAFF') return loadStaffFacts(context, db, locationIds, start, end, now)
  if (context.membership.role === 'ACCOUNTS') return loadAccountsFacts(context, db, locationIds, start, end)
  return { nextAssignedSegment: null, upcomingTimeOff: [], financeOrders: [], ...(await loadOperationsFacts(context, db, locationIds, start, end, now)) } as OverviewFacts
}

const defaults: Dependencies = { resolveContext: resolveBusinessContext, loadFacts: loadBusinessOverviewFacts }
function toAgendaItem(segment: OverviewSegment, locations: OverviewLocation[]): OverviewAgendaItem { return { id: segment.id, startsAt: segment.startsAt, endsAt: segment.endsAt, status: segment.status, offeringName: segment.offeringName, customerName: segment.customerName, locationName: locations.find((location) => location.id === segment.locationId)?.name ?? 'Assigned location' } }
function alertsFrom(facts: OverviewFacts, now: Date): OverviewAlert[] {
  const pendingInvitations = facts.pendingInvitations ?? []
  const expiring = pendingInvitations.filter(({ expiresAt }) => expiresAt.getTime() <= now.getTime() + 48 * 60 * 60 * 1000)
  return [
    ...facts.missingHours.map((location) => ({ kind: 'MISSING_HOURS' as const, message: `${location.name} is missing opening hours.` })),
    ...(facts.unassignedRequestedBookings ? [{ kind: 'UNASSIGNED_BOOKING' as const, message: `${facts.unassignedRequestedBookings} requested booking${facts.unassignedRequestedBookings === 1 ? '' : 's'} need a staff assignment.` }] : []),
    ...facts.servicesMissingQualifiedStaff.map((service) => ({ kind: 'UNQUALIFIED_SERVICE' as const, message: `${service.offeringName} has no qualified active staff at ${service.locationName}.` })),
    ...(pendingInvitations.length ? [{ kind: 'PENDING_INVITATION' as const, message: `${pendingInvitations.length} team invitation${pendingInvitations.length === 1 ? ' is' : 's are'} pending.` }] : []),
    ...(expiring.length ? [{ kind: 'EXPIRING_INVITATION' as const, message: `${expiring.length} team invitation${expiring.length === 1 ? '' : 's'} expire${expiring.length === 1 ? 's' : ''} within 48 hours.` }] : []),
  ]
}

export async function loadBusinessOverview(input: { actorId: string; now: Date }, dependencies: Partial<Dependencies> = {}): Promise<BusinessOverviewModel> {
  const resolved = { ...defaults, ...dependencies }
  const context = await resolved.resolveContext(input.actorId)
  const facts = await resolved.loadFacts(context, input.now)
  const locations = context.availableLocations
  const common: OverviewCommon = { business: context.business, locations, locationIds: locations.map((location) => location.id), alerts: alertsFrom(facts, input.now) }
  const activeToday = facts.todaySegments.filter((segment) => ACTIVE_SEGMENT_STATUSES.includes(segment.status))
  if (context.membership.role === 'OWNER' || context.membership.role === 'MANAGER') {
    const derived = { todayAppointments: activeToday.length, pendingApprovals: activeToday.filter((segment) => segment.status === 'REQUESTED').length, staffScheduledToday: new Set(activeToday.map((segment) => segment.membershipId).filter(Boolean)).size, locationUtilization: locations.map((location) => { const appointments = activeToday.filter((segment) => segment.locationId === location.id); const scheduledCapacity = appointments.reduce((total, segment) => total + segment.offeringCapacity, 0); const bookedCapacity = appointments.reduce((total, segment) => total + segment.attendeeCount, 0); return { locationId: location.id, locationName: location.name, scheduledCapacity, bookedCapacity, percentage: scheduledCapacity ? Math.round((bookedCapacity / scheduledCapacity) * 100) : 0 } }) }
    return { ...common, role: context.membership.role, ...(facts.operations ?? derived), agenda: activeToday.map((segment) => toAgendaItem(segment, locations)) }
  }
  if (context.membership.role === 'STAFF') return { ...common, role: 'STAFF', nextAppointment: facts.nextAssignedSegment ? toAgendaItem(facts.nextAssignedSegment, locations) : null, todaySchedule: activeToday.filter((segment) => segment.membershipId === context.membership.id).map((segment) => toAgendaItem(segment, locations)), upcomingTimeOff: facts.upcomingTimeOff }
  const locationIds = new Set(common.locationIds)
  const scopedBookedOrders = facts.financeOrders.filter((order) => BOOKED_ORDER_STATUSES.includes(order.status) && order.segments.length > 0 && order.segments.every((segment) => locationIds.has(segment.locationId)))
  const pendingOrders = scopedBookedOrders.filter((order) => order.paymentRequest?.status === 'PENDING')
  const derivedFinance = { bookedRevenueCents: scopedBookedOrders.reduce((total, order) => total + order.subtotalCents, 0), cashDueAtAppointmentCents: scopedBookedOrders.reduce((total, order) => total + order.dueAtAppointmentCents, 0), pendingOnlinePaymentCents: pendingOrders.reduce((total, order) => total + order.dueOnlineCents, 0), pendingOnlinePaymentRequests: pendingOrders.length }
  return { ...common, role: 'ACCOUNTS', ...(facts.financeSummary ?? derivedFinance), cashCollectedCents: 0, recentTransactions: scopedBookedOrders.slice(0, AGENDA_PREVIEW_LIMIT).map((order) => ({ id: order.id, amountCents: order.subtotalCents, cashDueCents: order.dueAtAppointmentCents, pendingOnlineCents: order.paymentRequest?.status === 'PENDING' ? order.dueOnlineCents : 0 })) }
}
