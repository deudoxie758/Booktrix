import { NextResponse } from 'next/server'

import { getActor, requireActor } from '@/modules/identity/session'
import { parseCreateBookingRequest, toBookingErrorResponse } from '@/modules/bookings/api'
import { createBookingOrder } from '@/modules/bookings/orders'
import { createPrismaOrderStore, listCustomerOrders } from '@/modules/bookings/repository'
import { persistBookingNotification } from '@/modules/notifications/booking-events'
import { paymentChoiceEnabled } from '@/lib/payment-mode'
import { prisma } from '@/lib/prisma'
import { buildIntakeSubmission } from '@/modules/intake/snapshot'

export async function GET() {
  try {
    const actor = await requireActor()
    return NextResponse.json({ orders: await listCustomerOrders(actor.id) })
  } catch (error) {
    const response = toBookingErrorResponse(error as { code?: string })
    return NextResponse.json(response.body, { status: response.status })
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getActor()
    const input = parseCreateBookingRequest(await request.json())
    if (!paymentChoiceEnabled(input.paymentChoice!)) {
      return NextResponse.json({ error: 'Online payments are not available. Please select cash payment.' }, { status: 503 })
    }
    const held = await prisma.bookingHold.findUnique({
      where: { token: input.holdToken },
      include: { Segments: { include: { offering: { include: { IntakeTemplates: { include: { template: { include: { Questions: { orderBy: { sortOrder: 'asc' } } } } } } } } } } },
    })
    if (!held) return NextResponse.json({ error: 'Your reserved time could not be found.' }, { status: 409 })
    const questions = Array.from(new Map(held.Segments.flatMap((segment) => segment.offering.IntakeTemplates.flatMap((assignment) => assignment.template.active ? assignment.template.Questions : [])).map((question) => [question.id, { id: question.id, label: question.label, type: question.type, options: question.options, required: question.required, sensitive: question.sensitive }])).values())
    const intake = buildIntakeSubmission({ questions, answers: input.intakeAnswers, sensitiveConsent: input.sensitiveConsent, secret: process.env.INTAKE_ENCRYPTION_SECRET ?? process.env.NEXTAUTH_SECRET ?? '' })
    const order = await createBookingOrder({
      holdToken: input.holdToken!,
      idempotencyKey: input.idempotencyKey!,
      paymentChoice: input.paymentChoice!,
      customerId: actor?.id ?? null,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      intake,
    }, { store: createPrismaOrderStore(), guestAccessSecret: process.env.GUEST_ACCESS_SECRET ?? process.env.NEXTAUTH_SECRET })
    if (actor) await persistBookingNotification({
      event: order.status === 'CONFIRMED' ? 'BOOKING_CONFIRMED' : 'BOOKING_REQUESTED',
      orderId: order.id,
      userId: actor.id,
    })
    return NextResponse.json({ order, guestAccessToken: order.guestAccessToken }, { status: 201 })
  } catch (error) {
    const response = toBookingErrorResponse(error as { code?: string })
    return NextResponse.json(response.body, { status: response.status })
  }
}
