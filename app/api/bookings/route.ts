import { NextResponse } from 'next/server'

import { requireActor } from '@/modules/identity/session'
import { parseCreateBookingRequest, toBookingErrorResponse } from '@/modules/bookings/api'
import { createBookingOrder } from '@/modules/bookings/orders'
import { createPrismaOrderStore, listCustomerOrders } from '@/modules/bookings/repository'
import { persistBookingNotification } from '@/modules/notifications/booking-events'
import { paymentChoiceEnabled } from '@/lib/payment-mode'

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
    const actor = await requireActor()
    const input = parseCreateBookingRequest(await request.json())
    if (!paymentChoiceEnabled(input.paymentChoice!)) {
      return NextResponse.json({ error: 'Online payments are not available. Please select cash payment.' }, { status: 503 })
    }
    const order = await createBookingOrder({
      holdToken: input.holdToken!,
      idempotencyKey: input.idempotencyKey!,
      paymentChoice: input.paymentChoice!,
      customerId: actor.id,
    }, { store: createPrismaOrderStore() })
    await persistBookingNotification({
      event: order.status === 'CONFIRMED' ? 'BOOKING_CONFIRMED' : 'BOOKING_REQUESTED',
      orderId: order.id,
      userId: actor.id,
    })
    return NextResponse.json({ order }, { status: 201 })
  } catch (error) {
    const response = toBookingErrorResponse(error as { code?: string })
    return NextResponse.json(response.body, { status: response.status })
  }
}
