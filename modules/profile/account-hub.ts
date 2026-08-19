import type { BusinessRole, Role } from '@prisma/client'

const ACTIVE_SEGMENT_STATUSES = new Set(['REQUESTED', 'CONFIRMED', 'IN_PROGRESS'])

type HubSegment = {
  id: string
  status: string
  startsAt: Date
  offering: { name: string }
  location: { id: string; name: string; timezone?: string }
  membership?: { id: string; user?: { name: string | null } | null } | null
}

export type HubOrder = {
  id: string
  businessId?: string
  status: string
  subtotalCents: number
  paidCents: number
  dueOnlineCents: number
  dueAtAppointmentCents: number
  createdAt: Date
  business: { id: string; name: string; slug: string }
  PaymentRequest?: { status: string } | null
  Segments: HubSegment[]
}

type HubMembership = {
  id: string
  role: BusinessRole
  locationIds: string[]
  business: { id: string; name: string; slug: string; status: string; activeTeamCount: number }
}

export type AccountHubModel = ReturnType<typeof buildAccountHub>

export function buildAccountHub(input: {
  now: Date
  user: { id: string; name: string | null; email: string; points: number; role: Role }
  memberships: HubMembership[]
  customerOrders: HubOrder[]
  businessOrders: HubOrder[]
  platformSummary?: { businesses: number; applicationsAwaitingReview: number }
}) {
  const upcomingOrders = input.customerOrders.filter((order) => order.Segments.some((segment) => isFutureActive(segment, input.now)))
  const next = upcomingOrders
    .flatMap((order) => order.Segments.filter((segment) => isFutureActive(segment, input.now)).map((segment) => ({ order, segment })))
    .sort((a, b) => a.segment.startsAt.getTime() - b.segment.startsAt.getTime())[0]

  return {
    identity: {
      name: input.user.name ?? 'Booktrix customer',
      email: input.user.email,
      initial: (input.user.name?.[0] ?? input.user.email[0] ?? 'B').toUpperCase(),
      points: input.user.points,
    },
    customer: {
      stats: {
        total: input.customerOrders.length,
        completed: input.customerOrders.filter((order) => order.status === 'COMPLETED').length,
        upcoming: upcomingOrders.length,
        spentCents: input.customerOrders.reduce((total, order) => total + order.paidCents, 0),
      },
      nextAppointment: next ? {
        orderId: next.order.id,
        startsAt: next.segment.startsAt,
        serviceName: next.segment.offering.name,
        businessName: next.order.business.name,
        locationName: next.segment.location.name,
        professionalName: next.segment.membership?.user?.name ?? null,
      } : null,
      recentOrders: input.customerOrders.slice(0, 3),
    },
    workspaces: input.memberships.map((membership) => {
      const authorizedLocations = new Set(membership.locationIds)
      const orders = input.businessOrders.filter((order) => (order.businessId ?? order.business.id) === membership.business.id && order.Segments.some((segment) => authorizedLocations.has(segment.location.id)))
      const scopedSegments = orders.flatMap((order) => order.Segments).filter((segment) => authorizedLocations.has(segment.location.id))
      const todaySegments = scopedSegments.filter((segment) => isSameSaintLuciaDay(segment.startsAt, input.now))
      const assigned = scopedSegments.filter((segment) => segment.membership?.id === membership.id && ACTIVE_SEGMENT_STATUSES.has(segment.status))
      return {
        businessId: membership.business.id,
        businessName: membership.business.name,
        businessStatus: membership.business.status,
        membershipId: membership.id,
        role: membership.role,
        label: roleLabel(membership.role),
        primaryHref: primaryWorkspaceHref(membership.role),
        todayAppointments: todaySegments.filter((segment) => ACTIVE_SEGMENT_STATUSES.has(segment.status)).length,
        pendingApprovals: orders.filter((order) => order.Segments.some((segment) => authorizedLocations.has(segment.location.id) && segment.status === 'REQUESTED')).length,
        activeTeamCount: membership.business.activeTeamCount,
        assignedToday: assigned.filter((segment) => isSameSaintLuciaDay(segment.startsAt, input.now)).length,
        assignedUpcoming: assigned.filter((segment) => segment.startsAt > input.now).length,
        recordedPaidCents: orders.reduce((total, order) => total + order.paidCents, 0),
        dueAtAppointmentCents: orders.reduce((total, order) => total + order.dueAtAppointmentCents, 0),
      }
    }),
    platformWorkspace: input.user.role === 'ADMIN' && input.platformSummary ? { ...input.platformSummary, href: '/admin' as const } : null,
  }
}

function isFutureActive(segment: HubSegment, now: Date) {
  return segment.startsAt > now && ACTIVE_SEGMENT_STATUSES.has(segment.status)
}

function isSameSaintLuciaDay(left: Date, right: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/St_Lucia', year: 'numeric', month: '2-digit', day: '2-digit' })
  return formatter.format(left) === formatter.format(right)
}

function roleLabel(role: BusinessRole) {
  if (role === 'ACCOUNTS') return 'Accounts'
  return `${role[0]}${role.slice(1).toLowerCase()}`
}

function primaryWorkspaceHref(role: BusinessRole) {
  if (role === 'OWNER' || role === 'MANAGER') return '/business/calendar' as const
  if (role === 'ACCOUNTS') return '/business/finance' as const
  return '/business/schedule' as const
}
