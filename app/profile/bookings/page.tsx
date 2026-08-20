import Link from 'next/link'

import { CustomerBookingCard } from '@/components/booking/CustomerBookingCard'
import { requireActor } from '@/modules/identity/session'
import { listCustomerOrders } from '@/modules/bookings/repository'

export const dynamic = 'force-dynamic'

export default async function CustomerBookingsPage() {
  const actor = await requireActor()
  const orders = await listCustomerOrders(actor.id)
  const now = Date.now()
  const isUpcoming = (order: typeof orders[number]) => order.Segments.some((segment) => segment.startsAt.getTime() > now && !['CANCELLED', 'COMPLETED', 'REJECTED'].includes(segment.status))
  const upcoming = orders.filter(isUpcoming)
  const history = orders.filter((order) => !isUpcoming(order))

  return <main className="min-h-screen bg-cream-100 px-5 py-8 sm:px-8 sm:py-12">
    <div className="mx-auto max-w-5xl">
      <Link href="/profile" className="text-sm font-semibold text-clay-600">← Back to profile</Link>
      <header className="mb-8 mt-6">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-clay-600">Your Booktrix</p>
        <h1 className="mt-2 font-display text-4xl text-cocoa-950 sm:text-5xl">Bookings</h1>
        <p className="mt-3 max-w-2xl text-cocoa-700">See every service in one place, including bookings that are still waiting for a business to approve.</p>
      </header>
      <section>
        <h2 className="mb-4 font-display text-2xl text-cocoa-950">Coming up</h2>
        <div className="grid gap-5">{upcoming.length ? upcoming.map((order) => <CustomerBookingCard key={order.id} order={order} />) : <EmptyState>Nothing scheduled yet.</EmptyState>}</div>
      </section>
      <section className="mt-12">
        <h2 className="mb-4 font-display text-2xl text-cocoa-950">History</h2>
        <div className="grid gap-5">{history.length ? history.map((order) => <CustomerBookingCard key={order.id} order={order} />) : <EmptyState>Your past bookings will appear here.</EmptyState>}</div>
      </section>
    </div>
  </main>
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-3xl border border-dashed border-sand-300 bg-white/60 px-6 py-10 text-center text-cocoa-600">{children}</div>
}
