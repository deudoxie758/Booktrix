import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import type { HoldRecord } from '@/modules/scheduling/holds'

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
  status: order.status,
  subtotalCents: order.subtotalCents,
  dueOnlineCents: order.dueOnlineCents,
  dueAtAppointmentCents: order.dueAtAppointmentCents,
  paymentChoice: order.paymentChoice,
  segments: order.Segments.map((segment: any) => ({ offeringId: segment.offeringId, locationId: segment.locationId, membershipId: segment.membershipId, start: segment.startsAt, end: segment.endsAt, occupiedStart: segment.occupiedStartsAt, occupiedEnd: segment.occupiedEndsAt, attendeeCount: segment.attendeeCount, capacity: Number.MAX_SAFE_INTEGER, priceCents: segment.priceCents, confirmationMode: segment.confirmationMode, status: segment.status })),
})

export function createPrismaOrderStore(): BookingOrderStore {
  let client: Client = prisma
  return {
    transaction: (work) => prisma.$transaction(async (tx) => {
      client = tx
      try { return await work() } finally { client = prisma }
    }),
    findByIdempotencyKey: async (key) => {
      const order = await client.bookingOrder.findUnique({ where: { idempotencyKey: key }, include: { Segments: true } })
      return order ? mappedOrder(order) : null
    },
    getActiveHold: async (token) => {
      const hold = await client.bookingHold.findUniqueOrThrow({ where: { token }, include: { Segments: true } })
      return mappedHold(hold)
    },
    getOfferings: (ids) => client.serviceOffering.findMany({ where: { id: { in: ids }, active: true, business: { status: 'PUBLISHED' } }, select: { id: true, confirmationMode: true, allowFullPayment: true, allowDeposit: true, allowCash: true, depositKind: true, depositValue: true } }),
    create: async (input) => mappedOrder(await client.bookingOrder.create({
      data: {
        idempotencyKey: input.idempotencyKey,
        businessId: input.businessId,
        customerId: input.customerId,
        status: input.status,
        subtotalCents: input.subtotalCents,
        dueOnlineCents: input.dueOnlineCents,
        dueAtAppointmentCents: input.dueAtAppointmentCents,
        paymentChoice: input.paymentChoice,
        Segments: { create: input.segments.map((segment) => ({ offeringId: segment.offeringId, locationId: segment.locationId, membershipId: segment.membershipId, startsAt: segment.start, endsAt: segment.end, occupiedStartsAt: segment.occupiedStart, occupiedEndsAt: segment.occupiedEnd, attendeeCount: segment.attendeeCount, priceCents: segment.priceCents, confirmationMode: segment.confirmationMode, status: segment.status })) },
      },
      include: { Segments: true },
    })),
    consumeHold: async (token, consumedAt) => { await client.bookingHold.update({ where: { token }, data: { consumedAt } }) },
  }
}

export function listCustomerOrders(customerId: string) {
  return prisma.bookingOrder.findMany({
    where: { customerId },
    include: { business: true, Segments: { include: { offering: true, location: true, membership: { include: { user: true } } } } },
    orderBy: { createdAt: 'desc' },
  })
}
