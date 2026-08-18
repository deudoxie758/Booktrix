import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import type { HoldRecord } from '@/modules/scheduling/holds'
import { schedulingLockBucketAt, schedulingRequestLockKeys } from '@/modules/scheduling/locking'
import { loadSchedulingFacts, toSchedulingSnapshot } from '@/modules/scheduling/repository'
import { deriveValidatedSegments } from '@/modules/scheduling/validation'

import type { BookingOrderStore } from './orders'

type Client = typeof prisma | Prisma.TransactionClient

const mappedHold = (hold: any): HoldRecord => ({
  token: hold.token,
  idempotencyKey: hold.idempotencyKey,
  businessId: hold.businessId,
  customerId: hold.customerId,
  checkoutIdentity: hold.checkoutIdentity,
  expiresAt: hold.expiresAt,
  consumedAt: hold.consumedAt,
  segments: hold.Segments.map((segment: any) => ({ offeringId: segment.offeringId, locationId: segment.locationId, membershipId: segment.membershipId, start: segment.startsAt, end: segment.endsAt, occupiedStart: segment.occupiedStartsAt, occupiedEnd: segment.occupiedEndsAt, attendeeCount: segment.attendeeCount, capacity: Number.MAX_SAFE_INTEGER, priceCents: segment.priceCents })),
})

const mappedOrder = (order: any) => ({
  id: order.id,
  idempotencyKey: order.idempotencyKey,
  businessId: order.businessId,
  customerId: order.customerId,
  holdToken: order.sourceHoldToken,
  status: order.status,
  subtotalCents: order.subtotalCents,
  dueOnlineCents: order.dueOnlineCents,
  dueAtAppointmentCents: order.dueAtAppointmentCents,
  paymentChoice: order.paymentChoice,
  paymentRequest: order.PaymentRequest ? {
    status: order.PaymentRequest.status,
    amountCents: order.PaymentRequest.amountCents,
    currency: order.PaymentRequest.currency,
    reference: order.PaymentRequest.reference,
    provider: order.PaymentRequest.provider,
  } : null,
  segments: order.Segments.map((segment: any) => ({ offeringId: segment.offeringId, locationId: segment.locationId, membershipId: segment.membershipId, start: segment.startsAt, end: segment.endsAt, occupiedStart: segment.occupiedStartsAt, occupiedEnd: segment.occupiedEndsAt, attendeeCount: segment.attendeeCount, capacity: Number.MAX_SAFE_INTEGER, priceCents: segment.priceCents, confirmationMode: segment.confirmationMode, status: segment.status })),
})

const samePersistedSegment = (derived: HoldRecord['segments'][number], held: HoldRecord['segments'][number]) =>
  derived.offeringId === held.offeringId
  && derived.locationId === held.locationId
  && derived.membershipId === held.membershipId
  && derived.start.getTime() === held.start.getTime()
  && derived.end.getTime() === held.end.getTime()
  && derived.occupiedStart.getTime() === held.occupiedStart.getTime()
  && derived.occupiedEnd.getTime() === held.occupiedEnd.getTime()
  && derived.attendeeCount === held.attendeeCount
  && derived.priceCents === held.priceCents

export function createPrismaOrderStore(client: Client = prisma): BookingOrderStore {
  return {
    transaction: (work) => prisma.$transaction((tx) => work(createPrismaOrderStore(tx)), { isolationLevel: 'ReadCommitted' }),
    findByIdempotencyKey: async (key) => {
      const order = await client.bookingOrder.findUnique({ where: { idempotencyKey: key }, include: { Segments: true, PaymentRequest: true } })
      return order ? mappedOrder(order) : null
    },
    acquireHoldLock: async (token) => {
      await client.$queryRaw`SELECT id FROM BookingHold WHERE token = ${token} FOR UPDATE`
    },
    getActiveHold: async (token) => {
      const hold = await client.bookingHold.findUniqueOrThrow({ where: { token }, include: { Segments: true } })
      return mappedHold(hold)
    },
    getOfferings: (ids, businessId) => client.serviceOffering.findMany({ where: { id: { in: ids }, businessId, active: true, business: { status: 'PUBLISHED' } }, select: { id: true, confirmationMode: true, allowFullPayment: true, allowDeposit: true, allowCash: true, depositKind: true, depositValue: true } }),
    revalidateHold: async (hold, now) => {
      const lockKeys = Array.from(new Set(hold.segments.flatMap((segment) => schedulingRequestLockKeys({ businessId: hold.businessId, ...segment })))).sort()
      for (const lockKey of lockKeys) {
        const bucketAt = schedulingLockBucketAt(lockKey)
        await client.schedulingLock.upsert({
          where: { lockKey },
          update: { bucketAt },
          create: { lockKey, businessId: hold.businessId, locationId: hold.segments[0]!.locationId, bucketAt },
        })
      }
      const facts = await loadSchedulingFacts({
        businessId: hold.businessId,
        locationId: hold.segments[0]!.locationId,
        offeringIds: hold.segments.map((segment) => segment.offeringId),
        membershipIds: hold.segments.map((segment) => segment.membershipId),
        rangeStart: new Date(Math.min(...hold.segments.map((segment) => segment.occupiedStart.getTime()))),
        rangeEnd: new Date(Math.max(...hold.segments.map((segment) => segment.occupiedEnd.getTime()))),
        excludeHoldToken: hold.token,
      }, client, now)
      const derived = deriveValidatedSegments({
        businessId: hold.businessId,
        locationId: hold.segments[0]!.locationId,
        segments: hold.segments.map((segment) => ({
          offeringId: segment.offeringId,
          membershipId: segment.membershipId,
          start: segment.start,
          attendeeCount: segment.attendeeCount,
        })),
      }, toSchedulingSnapshot(facts))
      if (derived.length !== hold.segments.length || derived.some((segment, index) => !samePersistedSegment(segment, hold.segments[index]!))) {
        throw Object.assign(new Error('SLOT_UNAVAILABLE'), { code: 'SLOT_UNAVAILABLE' })
      }
    },
    create: async (input) => mappedOrder(await client.bookingOrder.create({
      data: {
        idempotencyKey: input.idempotencyKey,
        sourceHoldToken: input.holdToken,
        businessId: input.businessId,
        customerId: input.customerId,
        status: input.status,
        subtotalCents: input.subtotalCents,
        dueOnlineCents: input.dueOnlineCents,
        dueAtAppointmentCents: input.dueAtAppointmentCents,
        paymentChoice: input.paymentChoice,
        PaymentRequest: input.paymentRequest ? { create: input.paymentRequest } : undefined,
        Segments: { create: input.segments.map((segment) => ({ offeringId: segment.offeringId, locationId: segment.locationId, membershipId: segment.membershipId, startsAt: segment.start, endsAt: segment.end, occupiedStartsAt: segment.occupiedStart, occupiedEndsAt: segment.occupiedEnd, attendeeCount: segment.attendeeCount, priceCents: segment.priceCents, confirmationMode: segment.confirmationMode, status: segment.status })) },
      },
      include: { Segments: true, PaymentRequest: true },
    })),
    consumeHoldIfActive: async (token, consumedAt) => {
      const result = await client.bookingHold.updateMany({ where: { token, consumedAt: null, expiresAt: { gt: consumedAt } }, data: { consumedAt } })
      return result.count === 1
    },
  }
}

export function listCustomerOrders(customerId: string) {
  return prisma.bookingOrder.findMany({
    where: { customerId },
    include: { business: true, Segments: { include: { offering: true, location: true, membership: { include: { user: true } } } } },
    orderBy: { createdAt: 'desc' },
  })
}

type CustomerOrderReader = Pick<typeof prisma.bookingOrder, 'findFirst'>

export class CustomerOrderNotFoundError extends Error {
  code = 'NOT_FOUND' as const

  constructor() {
    super('Booking not found')
    this.name = 'CustomerOrderNotFoundError'
  }
}

export async function getCustomerOrder(
  input: { orderId: string; customerId: string },
  reader: CustomerOrderReader = prisma.bookingOrder,
) {
  const order = await reader.findFirst({
    where: { id: input.orderId, customerId: input.customerId },
    include: {
      business: true,
      Segments: {
        include: { offering: true, location: true, membership: { include: { user: true } } },
        orderBy: { startsAt: 'asc' },
      },
    },
  })

  if (!order) throw new CustomerOrderNotFoundError()
  return order
}
