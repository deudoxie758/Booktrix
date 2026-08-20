import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CustomerBookingCard } from '@/components/booking/CustomerBookingCard'
import { canCustomerCancel } from '@/modules/bookings/policies'
import { CustomerOrderNotFoundError, getCustomerOrder } from '@/modules/bookings/repository'
import { requireActor } from '@/modules/identity/session'

import { CustomerBookingActions } from '../CustomerBookingActions'

export const dynamic = 'force-dynamic'

export default async function CustomerBookingDetailPage({ params }: { params: { orderId: string } }) {
  const actor = await requireActor()
  let order
  try {
    order = await getCustomerOrder({ orderId: params.orderId, customerId: actor.id })
  } catch (error) {
    if (error instanceof CustomerOrderNotFoundError) notFound()
    throw error
  }

  const now = new Date()
  const canCancel = order.Segments.some((segment) => canCustomerCancel({ status: segment.status, startsAt: segment.startsAt, now, leadMinutes: segment.offering.cancellationLeadMin }))
  const serviceIds = order.Segments.map((segment) => segment.offeringId).join(',')

  return <main className="min-h-screen bg-cream-100 px-5 py-8 sm:px-8 sm:py-12">
    <div className="mx-auto max-w-4xl">
      <Link href="/profile/bookings" className="text-sm font-semibold text-clay-600">← All bookings</Link>
      <header className="mb-7 mt-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-clay-600">Booking details</p><h1 className="mt-2 font-display text-4xl text-cocoa-950">Your appointment</h1></header>
      <CustomerBookingCard order={order} detailed />
      <CustomerBookingActions orderId={order.id} canCancel={canCancel} rescheduleHref={`/book/${order.business.slug}?services=${serviceIds}&reschedule=${order.id}`} />
      <p className="mt-4 text-xs text-cocoa-500">Choose a replacement time first. Your current appointment remains reserved until the new time is confirmed.</p>
    </div>
  </main>
}
