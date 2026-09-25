import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getGuestOrder } from '@/modules/bookings/repository'

export const dynamic = 'force-dynamic'

const dateTime = new Intl.DateTimeFormat('en-LC', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/St_Lucia' })

export default async function GuestBookingPage({ params }: { params: { token: string } }) {
  const order = await getGuestOrder(params.token).catch(() => null)
  if (!order) notFound()
  return <main className="min-h-screen bg-cream-100 px-5 py-10 sm:px-8"><div className="mx-auto max-w-3xl"><Link href="/" className="text-sm font-semibold text-clay-700">← Back to Booktrx</Link><section className="mt-7 rounded-3xl border border-sand-200 bg-white p-6 shadow-soft sm:p-9"><p className="text-xs font-bold uppercase tracking-[.18em] text-clay-600">Read-only guest booking</p><h1 className="mt-3 font-display text-4xl text-cocoa-950">Your appointment</h1><p className="mt-2 text-cocoa-600">{order.business.name} · {order.status.replaceAll('_', ' ')}</p><dl className="mt-7 grid gap-4 rounded-2xl bg-cream-50 p-5 sm:grid-cols-2"><div><dt className="text-xs font-bold uppercase tracking-wider text-cocoa-500">Guest</dt><dd className="mt-1 text-cocoa-900">{order.customerName}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wider text-cocoa-500">Contact</dt><dd className="mt-1 text-cocoa-900">{order.customerEmail}<br />{order.customerPhone}</dd></div></dl><div className="mt-7 space-y-4">{order.Segments.map((segment) => <article key={segment.id} className="rounded-2xl border border-sand-200 p-5"><h2 className="font-display text-2xl text-cocoa-950">{segment.offering.name}</h2><p className="mt-2 text-cocoa-700">{dateTime.format(segment.startsAt)}</p><p className="mt-1 text-sm text-cocoa-600">{segment.location.name}{segment.membership?.user.name ? ` · With ${segment.membership.user.name}` : ''}</p></article>)}</div><aside className="mt-7 rounded-2xl bg-sand-100 p-5 text-sm text-cocoa-700"><strong className="text-cocoa-950">Need to make a change?</strong><p className="mt-1">This private link is view-only. Sign in or contact the business to cancel or reschedule.</p></aside></section></div></main>
}
