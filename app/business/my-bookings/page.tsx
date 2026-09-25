import Link from 'next/link'

import { listAssignedBookings } from '@/modules/bookings/detail-access'
import { requireWorkspaceRole } from '@/modules/organizations/context'

export const dynamic = 'force-dynamic'
const dateTime = new Intl.DateTimeFormat('en-LC', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/St_Lucia' })

export default async function MyBookingsPage() {
  const context = await requireWorkspaceRole(['STAFF'])
  const segments = await listAssignedBookings({ actorId: context.actor.id })
  return <div className="space-y-7"><header><p className="text-xs font-bold uppercase tracking-[.18em] text-clay-600">Assigned work</p><h1 className="mt-2 font-display text-4xl text-cocoa-950">My bookings</h1><p className="mt-2 text-cocoa-600">Upcoming customer appointments assigned to you.</p></header>{segments.length ? <div className="space-y-3">{segments.map((segment) => <article key={segment.id} className="rounded-2xl border border-sand-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-clay-600">{segment.status.replaceAll('_', ' ')}</p><h2 className="mt-2 font-display text-2xl text-cocoa-950">{segment.offering.name}</h2><p className="mt-1 text-cocoa-700">{dateTime.format(segment.startsAt)}</p><p className="text-sm text-cocoa-600">{segment.location.name} · {segment.order.business.name}</p><Link href={`/business/bookings/${segment.orderId}`} className="mt-4 inline-flex rounded-full border border-sand-300 px-4 py-2 text-sm font-semibold text-cocoa-900">View customer and booking details</Link></article>)}</div> : <div className="rounded-3xl border border-dashed border-sand-300 bg-white/60 p-10 text-center text-cocoa-600">No upcoming assigned bookings.</div>}</div>
}
