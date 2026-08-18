import type { BookingSegmentStatus } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { requireLocationAccess } from '@/modules/organizations/access'
import { schedulingLockKeys } from '@/modules/scheduling/locking'
import { loadSchedulingFacts, toSchedulingSnapshot } from '@/modules/scheduling/repository'
import { deriveValidatedSegments } from '@/modules/scheduling/validation'

import { assertSegmentTransition } from './transitions'

type ManagedCustomer =
  | { kind: 'REGISTERED'; customerId: string }
  | { kind: 'WALK_IN'; name: string; email?: string; phone?: string }

export type ManagedBookingInput = {
  actorId: string
  businessId: string
  locationId: string
  customer: ManagedCustomer
  segments: Array<{ offeringId: string; membershipId: string; startsAt: Date; attendeeCount: number }>
  override: boolean
  overrideReason?: string
}

type ManagementDependencies = {
  authorizeLocation(locationId: string): Promise<unknown>
  authorizeOverride?(locationId: string): Promise<unknown>
  createFromHold(input: ManagedBookingInput, options: { override: boolean; overrideReason?: string }): Promise<unknown>
}

const managedError = (code: string) => Object.assign(new Error(code), { code })

async function createManagedBookingRecord(input: ManagedBookingInput, options: { override: boolean; overrideReason?: string }) {
  return prisma.$transaction(async (tx) => {
    const rangeStart = new Date(Math.min(...input.segments.map((segment) => segment.startsAt.getTime())) - 86_400_000)
    const rangeEnd = new Date(Math.max(...input.segments.map((segment) => segment.startsAt.getTime())) + 86_400_000)
    const query = { businessId: input.businessId, locationId: input.locationId, offeringIds: input.segments.map((segment) => segment.offeringId), rangeStart, rangeEnd }
    let facts = await loadSchedulingFacts(query, tx)
    let derived = deriveValidatedSegments({
      businessId: input.businessId,
      locationId: input.locationId,
      segments: input.segments.map((segment) => ({ offeringId: segment.offeringId, membershipId: segment.membershipId, start: segment.startsAt, attendeeCount: segment.attendeeCount })),
    }, toSchedulingSnapshot(facts), { overrideAvailability: options.override })
    const lockKeys = Array.from(new Set(derived.flatMap((segment) => schedulingLockKeys({ businessId: input.businessId, ...segment })))).sort()
    for (const lockKey of lockKeys) {
      const bucketAt = new Date(lockKey.slice(lockKey.lastIndexOf(':') + 1))
      await tx.schedulingLock.upsert({ where: { lockKey }, update: { bucketAt }, create: { lockKey, businessId: input.businessId, locationId: input.locationId, bucketAt } })
    }
    facts = await loadSchedulingFacts(query, tx)
    derived = deriveValidatedSegments({
      businessId: input.businessId,
      locationId: input.locationId,
      segments: input.segments.map((segment) => ({ offeringId: segment.offeringId, membershipId: segment.membershipId, start: segment.startsAt, attendeeCount: segment.attendeeCount })),
    }, toSchedulingSnapshot(facts), { overrideAvailability: options.override })
    const subtotalCents = derived.reduce((sum, item) => sum + item.priceCents, 0)
    const offeringModes = new Map(facts.offerings.map((offering) => [offering.id, offering.confirmationMode]))
    const order = await tx.bookingOrder.create({
      data: {
        businessId: input.businessId,
        customerId: input.customer.kind === 'REGISTERED' ? input.customer.customerId : null,
        customerName: input.customer.kind === 'WALK_IN' ? input.customer.name.trim() : null,
        customerEmail: input.customer.kind === 'WALK_IN' ? input.customer.email : null,
        customerPhone: input.customer.kind === 'WALK_IN' ? input.customer.phone : null,
        idempotencyKey: `managed:${input.actorId}:${crypto.randomUUID()}`,
        origin: input.customer.kind === 'WALK_IN' ? 'WALK_IN' : 'MANAGER',
        status: 'CONFIRMED', paymentChoice: 'CASH', subtotalCents, dueAtAppointmentCents: subtotalCents,
        Segments: { create: derived.map((segment) => ({
          offeringId: segment.offeringId, locationId: segment.locationId, membershipId: segment.membershipId,
          startsAt: segment.start, endsAt: segment.end, occupiedStartsAt: segment.occupiedStart, occupiedEndsAt: segment.occupiedEnd,
          attendeeCount: segment.attendeeCount, priceCents: segment.priceCents,
          confirmationMode: offeringModes.get(segment.offeringId) ?? 'AUTOMATIC', status: 'CONFIRMED',
        })) },
      },
      include: { Segments: true },
    })
    if (options.override) {
      for (const segment of order.Segments) {
        const resultingValues = { startsAt: segment.startsAt, endsAt: segment.endsAt, occupiedStartsAt: segment.occupiedStartsAt, occupiedEndsAt: segment.occupiedEndsAt, attendeeCount: segment.attendeeCount }
        await tx.bookingOverride.create({ data: { segmentId: segment.id, actorUserId: input.actorId, reason: options.overrideReason!, previousValues: {}, resultingValues } })
        await tx.auditLog.create({ data: { actorId: input.actorId, action: 'BOOKING_SCHEDULE_OVERRIDE', details: { businessId: input.businessId, locationId: input.locationId, orderId: order.id, segmentId: segment.id, reason: options.overrideReason, previousValues: {}, resultingValues } } })
      }
    }
    return order
  })
}

const defaults: ManagementDependencies = {
  authorizeLocation: (locationId) => requireLocationAccess(locationId, ['OWNER', 'MANAGER']),
  authorizeOverride: (locationId) => requireLocationAccess(locationId, ['OWNER', 'MANAGER']),
  createFromHold: createManagedBookingRecord,
}

export async function createManagedBooking(input: ManagedBookingInput, dependencies: ManagementDependencies = defaults) {
  const access = await dependencies.authorizeLocation(input.locationId) as { businessId?: string }
  if (access?.businessId && access.businessId !== input.businessId) throw managedError('FORBIDDEN')
  if (!input.segments.length || input.segments.some((segment) => !segment.membershipId || !Number.isInteger(segment.attendeeCount) || segment.attendeeCount < 1)) throw managedError('INVALID_BOOKING')
  if (input.customer.kind === 'WALK_IN' && !input.customer.name.trim()) throw managedError('INVALID_BOOKING')
  if (input.override) {
    const overrideReason = input.overrideReason?.trim()
    if (!overrideReason) throw managedError('OVERRIDE_REASON_REQUIRED')
    if (!dependencies.authorizeOverride) throw managedError('FORBIDDEN')
    await dependencies.authorizeOverride(input.locationId)
    return dependencies.createFromHold(input, { override: true, overrideReason })
  }
  return dependencies.createFromHold(input, { override: false })
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
