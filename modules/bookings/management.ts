import type { BookingSegmentStatus } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { requireLocationAccess } from '@/modules/organizations/access'

import { assertSegmentTransition } from './transitions'

type ManagedCustomer =
  | { kind: 'REGISTERED'; customerId: string }
  | { kind: 'WALK_IN'; name: string; email?: string; phone?: string }

export type ManagedBookingInput = {
  actorId: string
  businessId: string
  locationId: string
  customer: ManagedCustomer
  segments: Array<{ offeringId: string; membershipId?: string; startsAt: Date; endsAt: Date; occupiedStartsAt: Date; occupiedEndsAt: Date; priceCents: number; confirmationMode?: 'AUTOMATIC' | 'MANUAL' }>
  override: boolean
  overrideReason?: string
}

type ManagementDependencies = {
  authorizeLocation(locationId: string): Promise<unknown>
  createFromHold(input: ManagedBookingInput): Promise<unknown>
}

const defaults: ManagementDependencies = {
  authorizeLocation: (locationId) => requireLocationAccess(locationId, ['OWNER', 'MANAGER']),
  createFromHold: async (input) => prisma.bookingOrder.create({
    data: {
      businessId: input.businessId,
      customerId: input.customer.kind === 'REGISTERED' ? input.customer.customerId : null,
      customerName: input.customer.kind === 'WALK_IN' ? input.customer.name : null,
      customerEmail: input.customer.kind === 'WALK_IN' ? input.customer.email : null,
      customerPhone: input.customer.kind === 'WALK_IN' ? input.customer.phone : null,
      idempotencyKey: `managed:${input.actorId}:${crypto.randomUUID()}`,
      origin: input.customer.kind === 'WALK_IN' ? 'WALK_IN' : 'MANAGER',
      status: 'CONFIRMED', paymentChoice: 'CASH', subtotalCents: input.segments.reduce((sum, item) => sum + item.priceCents, 0), dueAtAppointmentCents: input.segments.reduce((sum, item) => sum + item.priceCents, 0),
      Segments: { create: input.segments.map((segment) => ({ ...segment, locationId: input.locationId, attendeeCount: 1, confirmationMode: segment.confirmationMode ?? 'AUTOMATIC', status: 'CONFIRMED' })) },
    },
    include: { Segments: true },
  }),
}

export async function createManagedBooking(input: ManagedBookingInput, dependencies: ManagementDependencies = defaults) {
  await dependencies.authorizeLocation(input.locationId)
  if (input.override && !input.overrideReason?.trim()) throw new Error('OVERRIDE_REASON_REQUIRED')
  return dependencies.createFromHold(input)
}

export async function listManagedSegments(input: { locationId: string; from: Date; to: Date; membershipId?: string; offeringId?: string; status?: BookingSegmentStatus }) {
  await requireLocationAccess(input.locationId, ['OWNER', 'MANAGER', 'STAFF'])
  return prisma.bookingSegment.findMany({
    where: { locationId: input.locationId, startsAt: { gte: input.from, lt: input.to }, ...(input.membershipId && { membershipId: input.membershipId }), ...(input.offeringId && { offeringId: input.offeringId }), ...(input.status && { status: input.status }) },
    include: { order: { include: { customer: true } }, offering: true, location: true, membership: { include: { user: true } } },
    orderBy: { startsAt: 'asc' },
  })
}

export async function manageBookingSegment(input: { segmentId: string; locationId: string; status: BookingSegmentStatus }) {
  const access = await requireLocationAccess(input.locationId, ['OWNER', 'MANAGER'])
  const segment = await prisma.bookingSegment.findFirst({ where: { id: input.segmentId, locationId: input.locationId } })
  if (!segment) throw Object.assign(new Error('BOOKING_NOT_FOUND'), { code: 'NOT_FOUND' })
  assertSegmentTransition(segment.status, input.status)
  return prisma.bookingSegment.update({ where: { id: segment.id }, data: { status: input.status } })
}
