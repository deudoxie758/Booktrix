import type { BusinessRole } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { decryptSensitiveIntake } from '@/modules/intake/encryption'

type Scope = { role: BusinessRole; membershipId: string; locationIds: string[] }
type Segment = { id: string; locationId: string; membershipId: string | null }

export function bookingDetailScope(scope: Scope, segments: Segment[]) {
  if (scope.role === 'ACCOUNTS') return { allowed: false, segmentIds: [] as string[] }
  if (scope.role === 'OWNER') return { allowed: true, segmentIds: segments.map((item) => item.id) }
  if (scope.role === 'MANAGER') {
    const allowed = segments.length > 0 && segments.every((item) => scope.locationIds.includes(item.locationId))
    return { allowed, segmentIds: allowed ? segments.map((item) => item.id) : [] }
  }
  const segmentIds = segments.filter((item) => item.membershipId === scope.membershipId).map((item) => item.id)
  return { allowed: segmentIds.length > 0, segmentIds }
}

export async function getAuthorizedBookingDetail(input: { orderId: string; actorId: string }) {
  const order = await prisma.bookingOrder.findUnique({
    where: { id: input.orderId },
    include: {
      business: true,
      customer: { select: { id: true, name: true, email: true } },
      PaymentRequest: true,
      CashCollections: { orderBy: { createdAt: 'desc' } },
      Segments: { include: { offering: true, location: true, membership: { include: { user: true } } }, orderBy: { startsAt: 'asc' } },
    },
  })
  if (!order) return null
  const membership = await prisma.businessMembership.findFirst({
    where: { businessId: order.businessId, userId: input.actorId, active: true },
    include: { Locations: { select: { locationId: true } } },
  })
  if (!membership) return null
  const scope = bookingDetailScope({ role: membership.role, membershipId: membership.id, locationIds: membership.Locations.map((item) => item.locationId) }, order.Segments)
  if (!scope.allowed) return null
  let sensitiveIntake: Record<string, unknown> = {}
  if (order.sensitiveIntakeCiphertext && order.sensitiveIntakeIv && order.sensitiveIntakeTag) {
    const secret = process.env.INTAKE_ENCRYPTION_SECRET ?? process.env.NEXTAUTH_SECRET
    if (secret) {
      await prisma.sensitiveIntakeAccessAudit.create({ data: { businessId: order.businessId, orderId: order.id, actorUserId: input.actorId, accessType: 'VIEW' } })
      sensitiveIntake = decryptSensitiveIntake({ ciphertext: order.sensitiveIntakeCiphertext, iv: order.sensitiveIntakeIv, tag: order.sensitiveIntakeTag }, secret)
    }
  }
  return { ...order, viewerRole: membership.role, intakeAnswers: { ...((order.intakeResponses as Record<string, unknown> | null) ?? {}), ...sensitiveIntake }, Segments: order.Segments.filter((item) => scope.segmentIds.includes(item.id)) }
}

export async function listAssignedBookings(input: { actorId: string; from?: Date }) {
  const memberships = await prisma.businessMembership.findMany({ where: { userId: input.actorId, role: 'STAFF', active: true }, select: { id: true } })
  return prisma.bookingSegment.findMany({
    where: { membershipId: { in: memberships.map((item) => item.id) }, startsAt: { gte: input.from ?? new Date() }, status: { in: ['REQUESTED', 'CONFIRMED', 'IN_PROGRESS'] } },
    include: { order: { include: { business: true } }, offering: true, location: true },
    orderBy: { startsAt: 'asc' },
  })
}
