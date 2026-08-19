import type { BusinessRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { resolveBusinessContext } from '@/modules/organizations/context'

const ACTIVE_SEGMENT_STATUSES = new Set(['REQUESTED', 'CONFIRMED', 'IN_PROGRESS'])
const BOOKED_ORDER_STATUSES = new Set(['PAYMENT_PENDING', 'REQUESTED', 'CONFIRMED', 'COMPLETED', 'PARTIALLY_CANCELLED'])

type OverviewLocation = { id: string; name: string; timezone: string }
type OverviewSegment = {
  id: string
  locationId: string
  membershipId: string | null
  startsAt: Date
  endsAt: Date
  status: string
  attendeeCount: number
  priceCents: number
  offeringName: string
  offeringCapacity: number
  customerName: string
}
type OverviewFinanceOrder = {
  id: string
  status: string
  subtotalCents: number
  dueAtAppointmentCents: number
  dueOnlineCents: number
  paymentRequest: { status: string } | null
  segments: Array<{ locationId: string; priceCents: number }>
}
type OverviewFacts = {
  todaySegments: OverviewSegment[]
  nextAssignedSegment: OverviewSegment | null
  upcomingTimeOff: Array<{ id: string; startsAt: Date; endsAt: Date; locationName: string; reason: string | null }>
  financeOrders: OverviewFinanceOrder[]
  missingHours: Array<{ id: string; name: string }>
  unassignedRequestedBookings: number
  servicesMissingQualifiedStaff: Array<{ offeringName: string; locationName: string }>
}
type OverviewContext = {
  business: { id: string; name: string; status: string }
  membership: { id: string; role: BusinessRole }
  availableLocations: OverviewLocation[]
}

export type OverviewAlert = { kind: 'MISSING_HOURS' | 'UNASSIGNED_BOOKING' | 'UNQUALIFIED_SERVICE'; message: string }
type OverviewCommon = { business: { id: string; name: string; status: string }; locations: OverviewLocation[]; locationIds: string[]; alerts: OverviewAlert[] }
type OverviewAgendaItem = Pick<OverviewSegment, 'id' | 'startsAt' | 'endsAt' | 'status' | 'offeringName' | 'customerName'> & { locationName: string }

type OperationsOverview = OverviewCommon & {
  role: 'OWNER' | 'MANAGER'
  todayAppointments: number
  pendingApprovals: number
  staffScheduledToday: number
  locationUtilization: Array<{ locationId: string; locationName: string; scheduledCapacity: number; bookedCapacity: number; percentage: number }>
  agenda: OverviewAgendaItem[]
}
type StaffOverview = OverviewCommon & {
  role: 'STAFF'
  nextAppointment: OverviewAgendaItem | null
  todaySchedule: OverviewAgendaItem[]
  upcomingTimeOff: OverviewFacts['upcomingTimeOff']
}
type AccountsOverview = OverviewCommon & {
  role: 'ACCOUNTS'
  bookedRevenueCents: number
  cashCollectedCents: number
  cashDueAtAppointmentCents: number
  pendingOnlinePaymentCents: number
  pendingOnlinePaymentRequests: number
  recentTransactions: Array<{ id: string; amountCents: number; cashDueCents: number; pendingOnlineCents: number }>
}

export type BusinessOverviewModel = OperationsOverview | StaffOverview | AccountsOverview

type Dependencies = {
  resolveContext(actorId: string): Promise<OverviewContext>
  loadFacts(context: OverviewContext, now: Date): Promise<OverviewFacts>
}

function saintLuciaDayBounds(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/St_Lucia', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value)
  const start = new Date(Date.UTC(value('year'), value('month') - 1, value('day'), 4))
  return { start, end: new Date(start.getTime() + 86_400_000) }
}

function mapSegment(segment: any): OverviewSegment {
  return {
    id: segment.id,
    locationId: segment.locationId,
    membershipId: segment.membershipId,
    startsAt: segment.startsAt,
    endsAt: segment.endsAt,
    status: segment.status,
    attendeeCount: segment.attendeeCount,
    priceCents: segment.priceCents,
    offeringName: segment.offering.name,
    offeringCapacity: segment.offering.capacity,
    customerName: segment.order.customer?.name ?? segment.order.customerName ?? 'Walk-in customer',
  }
}

async function defaultLoadFacts(context: OverviewContext, now: Date): Promise<OverviewFacts> {
  const locationIds = context.availableLocations.map((location) => location.id)
  const { start, end } = saintLuciaDayBounds(now)
  const scopedSegments = {
    locationId: { in: locationIds },
    startsAt: { gte: start, lt: end },
  }
  const [todaySegments, nextAssignedSegment, upcomingTimeOff, financeOrders, missingHours, unassignedRequestedBookings, offerings] = await Promise.all([
    prisma.bookingSegment.findMany({
      where: scopedSegments,
      include: { offering: { select: { name: true, capacity: true } }, location: { select: { name: true } }, order: { include: { customer: { select: { name: true } } } } },
      orderBy: { startsAt: 'asc' },
    }),
    context.membership.role === 'STAFF' ? prisma.bookingSegment.findFirst({
      where: { membershipId: context.membership.id, startsAt: { gte: now }, status: { in: ['REQUESTED', 'CONFIRMED', 'IN_PROGRESS'] } },
      include: { offering: { select: { name: true, capacity: true } }, location: { select: { name: true } }, order: { include: { customer: { select: { name: true } } } } },
      orderBy: { startsAt: 'asc' },
    }) : null,
    context.membership.role === 'STAFF' ? prisma.staffTimeOff.findMany({
      where: { membershipId: context.membership.id, endsAt: { gte: now } },
      include: { location: { select: { name: true } } },
      orderBy: { startsAt: 'asc' },
      take: 3,
    }) : [],
    context.membership.role === 'ACCOUNTS' ? prisma.bookingOrder.findMany({
      where: { businessId: context.business.id, Segments: { some: scopedSegments } },
      select: { id: true, status: true, subtotalCents: true, dueAtAppointmentCents: true, dueOnlineCents: true, PaymentRequest: { select: { status: true } }, Segments: { select: { locationId: true, priceCents: true } } },
      orderBy: { createdAt: 'desc' },
    }) : [],
    context.membership.role === 'OWNER' || context.membership.role === 'MANAGER' ? prisma.location.findMany({
      where: { id: { in: locationIds }, Hours: { none: {} } },
      select: { id: true, name: true },
    }) : [],
    context.membership.role === 'OWNER' || context.membership.role === 'MANAGER' ? prisma.bookingSegment.count({
      where: { locationId: { in: locationIds }, status: 'REQUESTED', membershipId: null },
    }) : 0,
    context.membership.role === 'OWNER' || context.membership.role === 'MANAGER' ? prisma.serviceOffering.findMany({
      where: { businessId: context.business.id, active: true, Locations: { some: { locationId: { in: locationIds }, active: true } } },
      select: {
        name: true,
        Locations: { where: { locationId: { in: locationIds }, active: true }, select: { locationId: true, location: { select: { name: true } } } },
        Qualifications: { where: { active: true, membership: { active: true, role: 'STAFF' } }, select: { locationId: true } },
      },
    }) : [],
  ])

  return {
    todaySegments: todaySegments.map(mapSegment),
    nextAssignedSegment: nextAssignedSegment ? mapSegment(nextAssignedSegment) : null,
    upcomingTimeOff: upcomingTimeOff.map((timeOff) => ({ id: timeOff.id, startsAt: timeOff.startsAt, endsAt: timeOff.endsAt, locationName: timeOff.location.name, reason: timeOff.reason })),
    financeOrders: financeOrders.map((order) => ({ id: order.id, status: order.status, subtotalCents: order.subtotalCents, dueAtAppointmentCents: order.dueAtAppointmentCents, dueOnlineCents: order.dueOnlineCents, paymentRequest: order.PaymentRequest, segments: order.Segments })),
    missingHours,
    unassignedRequestedBookings,
    servicesMissingQualifiedStaff: offerings.flatMap((offering) => offering.Locations.filter((location) => !offering.Qualifications.some((qualification) => qualification.locationId === location.locationId)).map((location) => ({ offeringName: offering.name, locationName: location.location.name }))),
  }
}

const defaults: Dependencies = { resolveContext: resolveBusinessContext, loadFacts: defaultLoadFacts }

function toAgendaItem(segment: OverviewSegment, locations: OverviewLocation[]): OverviewAgendaItem {
  return { id: segment.id, startsAt: segment.startsAt, endsAt: segment.endsAt, status: segment.status, offeringName: segment.offeringName, customerName: segment.customerName, locationName: locations.find((location) => location.id === segment.locationId)?.name ?? 'Assigned location' }
}

function alertsFrom(facts: OverviewFacts): OverviewAlert[] {
  return [
    ...facts.missingHours.map((location) => ({ kind: 'MISSING_HOURS' as const, message: `${location.name} is missing opening hours.` })),
    ...(facts.unassignedRequestedBookings ? [{ kind: 'UNASSIGNED_BOOKING' as const, message: `${facts.unassignedRequestedBookings} requested booking${facts.unassignedRequestedBookings === 1 ? '' : 's'} need a staff assignment.` }] : []),
    ...facts.servicesMissingQualifiedStaff.map((service) => ({ kind: 'UNQUALIFIED_SERVICE' as const, message: `${service.offeringName} has no qualified active staff at ${service.locationName}.` })),
  ]
}

export async function loadBusinessOverview(input: { actorId: string; now: Date }, dependencies: Partial<Dependencies> = {}): Promise<BusinessOverviewModel> {
  const resolved = { ...defaults, ...dependencies }
  const context = await resolved.resolveContext(input.actorId)
  const facts = await resolved.loadFacts(context, input.now)
  const locations = context.availableLocations
  const common: OverviewCommon = { business: context.business, locations, locationIds: locations.map((location) => location.id), alerts: alertsFrom(facts) }
  const activeToday = facts.todaySegments.filter((segment) => ACTIVE_SEGMENT_STATUSES.has(segment.status))

  if (context.membership.role === 'OWNER' || context.membership.role === 'MANAGER') {
    return {
      ...common,
      role: context.membership.role,
      todayAppointments: activeToday.length,
      pendingApprovals: activeToday.filter((segment) => segment.status === 'REQUESTED').length,
      staffScheduledToday: new Set(activeToday.map((segment) => segment.membershipId).filter(Boolean)).size,
      locationUtilization: locations.map((location) => {
        const appointments = activeToday.filter((segment) => segment.locationId === location.id)
        const scheduledCapacity = appointments.reduce((total, segment) => total + segment.offeringCapacity, 0)
        const bookedCapacity = appointments.reduce((total, segment) => total + segment.attendeeCount, 0)
        return { locationId: location.id, locationName: location.name, scheduledCapacity, bookedCapacity, percentage: scheduledCapacity ? Math.round((bookedCapacity / scheduledCapacity) * 100) : 0 }
      }),
      agenda: activeToday.map((segment) => toAgendaItem(segment, locations)),
    }
  }

  if (context.membership.role === 'STAFF') {
    const assignedToday = activeToday.filter((segment) => segment.membershipId === context.membership.id)
    return { ...common, role: 'STAFF', nextAppointment: facts.nextAssignedSegment ? toAgendaItem(facts.nextAssignedSegment, locations) : null, todaySchedule: assignedToday.map((segment) => toAgendaItem(segment, locations)), upcomingTimeOff: facts.upcomingTimeOff }
  }

  const locationIds = new Set(common.locationIds)
  const scopedBookedOrders = facts.financeOrders.filter((order) => BOOKED_ORDER_STATUSES.has(order.status) && order.segments.length > 0 && order.segments.every((segment) => locationIds.has(segment.locationId)))
  const pendingOrders = scopedBookedOrders.filter((order) => order.paymentRequest?.status === 'PENDING')
  return {
    ...common,
    role: 'ACCOUNTS',
    bookedRevenueCents: scopedBookedOrders.reduce((total, order) => total + order.subtotalCents, 0),
    cashCollectedCents: 0,
    cashDueAtAppointmentCents: scopedBookedOrders.reduce((total, order) => total + order.dueAtAppointmentCents, 0),
    pendingOnlinePaymentCents: pendingOrders.reduce((total, order) => total + order.dueOnlineCents, 0),
    pendingOnlinePaymentRequests: pendingOrders.length,
    recentTransactions: scopedBookedOrders.slice(0, 6).map((order) => ({ id: order.id, amountCents: order.subtotalCents, cashDueCents: order.dueAtAppointmentCents, pendingOnlineCents: order.paymentRequest?.status === 'PENDING' ? order.dueOnlineCents : 0 })),
  }
}
