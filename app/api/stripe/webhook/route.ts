import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
	if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
		return NextResponse.json({ error: 'Legacy Stripe integration is not configured' }, { status: 503 })
	}
	console.warn('Deprecated Stripe webhook invoked; Booktrix payment providers must use modules/payments')
	const sig = req.headers.get('stripe-signature') || ''
	let event: Stripe.Event
	const buf = await req.text()

	try {
		event = stripe.webhooks.constructEvent(
			buf,
			sig,
			process.env.STRIPE_WEBHOOK_SECRET!
		)
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Invalid webhook'
		return new NextResponse(`Webhook Error: ${message}`, { status: 400 })
	}

	if (event.type === 'payment_intent.succeeded') {
		const pi = event.data.object as Stripe.PaymentIntent
		const bookingId = pi.metadata.bookingId
		if (bookingId) {
			await prisma.booking.update({
				where: { id: bookingId },
				data: {
					paymentStatus: 'PAID',
					paidCents: pi.amount,
					status: 'CONFIRMED',
				},
			})
		}
	}

	return NextResponse.json({ received: true })
}
