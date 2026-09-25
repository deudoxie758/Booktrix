import Link from 'next/link'

import { prisma } from '@/lib/prisma'
import { requireWorkspaceRole } from '@/modules/organizations/context'

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  const context = await requireWorkspaceRole(['OWNER', 'MANAGER'])
  const locationIds = context.availableLocations.map((item) => item.id)
  const orders = await prisma.bookingOrder.findMany({
    where: { businessId: context.business.id, Segments: { some: { locationId: { in: locationIds } } } },
    include: { customer: { select: { id: true, name: true, email: true } }, Segments: { where: { locationId: { in: locationIds } }, orderBy: { startsAt: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  })
  const now = new Date()
  const customers = new Map<string, { name: string; email: string | null; phone: string | null; orders: typeof orders; latest: Date; upcoming: Date | null }>()
  for (const order of orders) {
    const email = order.customer?.email ?? order.customerEmail
    const key = order.customerId ?? email?.toLowerCase() ?? order.customerPhone ?? `order:${order.id}`
    const visits = order.Segments.map((item) => item.startsAt)
    const latest = new Date(Math.max(order.createdAt.getTime(), ...visits.map((item) => item.getTime())))
    const next = visits.filter((item) => item >= now).sort((a, b) => a.getTime() - b.getTime())[0] ?? null
    const existing = customers.get(key)
    if (existing) {
      existing.orders.push(order)
      if (latest > existing.latest) existing.latest = latest
      if (next && (!existing.upcoming || next < existing.upcoming)) existing.upcoming = next
    } else customers.set(key, { name: order.customer?.name ?? order.customerName ?? 'Walk-in customer', email, phone: order.customerPhone, orders: [order], latest, upcoming: next })
  }
  const date = new Intl.DateTimeFormat('en-LC', { dateStyle: 'medium', timeZone: 'America/St_Lucia' })
  return <div className="space-y-7"><header><p className="text-xs font-bold uppercase tracking-[.18em] text-clay-600">Relationships</p><h1 className="mt-2 font-display text-4xl text-cocoa-950">Customers</h1><p className="mt-2 text-cocoa-600">Location-scoped contact details and booking history. Private intake responses stay on individual bookings.</p></header>{customers.size ? <div className="grid gap-4 lg:grid-cols-2">{Array.from(customers.entries()).map(([key, customer]) => <article key={key} className="rounded-2xl border border-sand-200 bg-white p-5"><h2 className="font-display text-2xl text-cocoa-950">{customer.name}</h2><p className="mt-1 text-sm text-cocoa-600">{customer.email ?? 'No email'}{customer.phone ? ` · ${customer.phone}` : ''}</p><dl className="mt-4 grid grid-cols-3 gap-3 text-sm"><div><dt className="text-cocoa-500">Bookings</dt><dd className="font-semibold text-cocoa-950">{customer.orders.length}</dd></div><div><dt className="text-cocoa-500">Latest</dt><dd className="font-semibold text-cocoa-950">{date.format(customer.latest)}</dd></div><div><dt className="text-cocoa-500">Upcoming</dt><dd className="font-semibold text-cocoa-950">{customer.upcoming ? date.format(customer.upcoming) : 'None'}</dd></div></dl><div className="mt-4 flex flex-wrap gap-2">{customer.orders.slice(0, 3).map((order) => <Link key={order.id} href={`/business/bookings/${order.id}`} className="rounded-full border border-sand-300 px-3 py-1.5 text-xs font-semibold text-cocoa-800">Booking {order.createdAt.toLocaleDateString('en-LC')}</Link>)}</div></article>)}</div> : <div className="rounded-3xl border border-dashed border-sand-300 bg-white/60 p-10 text-center text-cocoa-600">Customers appear here after their first booking.</div>}</div>
}
