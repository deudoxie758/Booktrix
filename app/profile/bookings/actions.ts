'use server'

import { revalidatePath } from 'next/cache'

import { prisma } from '@/lib/prisma'
import { canCustomerCancel, canCustomerReschedule } from '@/modules/bookings/policies'
import { requireActor } from '@/modules/identity/session'

export type CustomerBookingActionResult = { ok: true } | { ok: false; error: string }

export async function cancelBookingAction(formData: FormData): Promise<CustomerBookingActionResult> {
  const actor = await requireActor()
  const orderId = String(formData.get('orderId') ?? '')
  if (!orderId) return { ok: false, error: 'Booking is required.' }

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.bookingOrder.findFirst({
      where: { id: orderId, customerId: actor.id },
      include: { Segments: { include: { offering: true } } },
    })
    if (!order) return { ok: false as const, error: 'Booking not found.' }

    const now = new Date()
    const cancellable = order.Segments.filter((segment) => canCustomerCancel({
      status: segment.status,
      startsAt: segment.startsAt,
      now,
      leadMinutes: segment.offering.cancellationLeadMin,
    }))
    if (!cancellable.length) return { ok: false as const, error: 'This booking can no longer be cancelled online.' }

    await tx.bookingSegment.updateMany({
      where: { id: { in: cancellable.map((segment) => segment.id) } },
      data: { status: 'CANCELLED' },
    })
    const fullyCancelled = cancellable.length === order.Segments.filter((segment) => segment.status !== 'CANCELLED').length
    await tx.bookingOrder.update({ where: { id: order.id }, data: { status: fullyCancelled ? 'CANCELLED' : 'PARTIALLY_CANCELLED' } })
    return { ok: true as const }
  })

  if (result.ok) {
    revalidatePath('/profile/bookings')
    revalidatePath(`/profile/bookings/${orderId}`)
  }
  return result
}

export async function rescheduleBookingAction(formData: FormData): Promise<CustomerBookingActionResult> {
  const actor = await requireActor()
  const orderId = String(formData.get('orderId') ?? '')
  const replacementHoldToken = String(formData.get('replacementHoldToken') ?? '')
  if (!orderId || !replacementHoldToken) return { ok: false, error: 'Booking and replacement time are required.' }

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.bookingOrder.findFirst({
      where: { id: orderId, customerId: actor.id },
      include: { Segments: { include: { offering: true }, orderBy: { startsAt: 'asc' } } },
    })
    if (!order) return { ok: false as const, error: 'Booking not found.' }
    if (!order.Segments.length || order.Segments.some((segment) => !canCustomerReschedule({
      status: segment.status,
      startsAt: segment.startsAt,
      now: new Date(),
      leadMinutes: segment.offering.cancellationLeadMin,
    }))) return { ok: false as const, error: 'This booking can no longer be rescheduled online.' }

    const hold = await tx.bookingHold.findFirst({
      where: { token: replacementHoldToken, customerId: actor.id, businessId: order.businessId, consumedAt: null, expiresAt: { gt: new Date() } },
      include: { Segments: { orderBy: { startsAt: 'asc' } } },
    })
    if (!hold || hold.Segments.length !== order.Segments.length) return { ok: false as const, error: 'That replacement time is no longer available.' }
    if (hold.Segments.some((segment, index) => segment.offeringId !== order.Segments[index]?.offeringId)) {
      return { ok: false as const, error: 'Replacement services must match the original booking.' }
    }

    for (let index = 0; index < order.Segments.length; index += 1) {
      const segment = order.Segments[index]
      const replacement = hold.Segments[index]
      await tx.bookingSegment.update({
        where: { id: segment.id },
        data: {
          locationId: replacement.locationId,
          membershipId: replacement.membershipId,
          startsAt: replacement.startsAt,
          endsAt: replacement.endsAt,
          occupiedStartsAt: replacement.occupiedStartsAt,
          occupiedEndsAt: replacement.occupiedEndsAt,
        },
      })
    }
    await tx.bookingHold.update({ where: { id: hold.id }, data: { consumedAt: new Date() } })
    return { ok: true as const }
  })

  if (result.ok) {
    revalidatePath('/profile/bookings')
    revalidatePath(`/profile/bookings/${orderId}`)
  }
  return result
}
