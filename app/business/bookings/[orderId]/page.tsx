import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getAuthorizedBookingDetail } from '@/modules/bookings/detail-access'
import { requireActor } from '@/modules/identity/session'

export const dynamic = 'force-dynamic'
const dateTime = new Intl.DateTimeFormat('en-LC', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/St_Lucia' })
const money = (cents: number, currency: string) => new Intl.NumberFormat('en-LC', { style: 'currency', currency }).format(cents / 100)

export default async function BusinessBookingDetailPage({ params }: { params: { orderId: string } }) {
  const actor = await requireActor()
  const order = await getAuthorizedBookingDetail({ orderId: params.orderId, actorId: actor.id })
  if (!order) notFound()
  const customerName = order.customer?.name ?? order.customerName ?? 'Walk-in customer'
  const customerEmail = order.customer?.email ?? order.customerEmail
  const intakeDefinition = Array.isArray(order.intakeDefinition) ? order.intakeDefinition as Array<{ id?: string; label?: string; sensitive?: boolean }> : []
  return <div className="space-y-7">
    <header><Link href={order.viewerRole === 'STAFF' ? '/business/my-bookings' : '/business/calendar'} className="text-sm font-semibold text-clay-700">← Back to bookings</Link><p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-clay-600">Booking details</p><h1 className="mt-2 font-display text-4xl text-cocoa-950">{customerName}</h1><p className="mt-2 text-cocoa-600">Order {order.id} · {order.status.replaceAll('_', ' ')}</p></header>
    <section className="grid gap-5 rounded-3xl border border-sand-200 bg-white p-6 sm:grid-cols-2"><div><h2 className="text-xs font-bold uppercase tracking-wider text-cocoa-500">Customer contact</h2><p className="mt-2 text-cocoa-900">{customerEmail ?? 'No email provided'}<br />{order.customerPhone ?? 'No phone provided'}</p></div><div><h2 className="text-xs font-bold uppercase tracking-wider text-cocoa-500">Payment</h2><p className="mt-2 text-cocoa-900">{order.paymentChoice.replaceAll('_', ' ')} · {money(order.subtotalCents, order.currency)}</p><p className="text-sm text-cocoa-600">Paid {money(order.paidCents, order.currency)} · Due at appointment {money(order.dueAtAppointmentCents, order.currency)}</p></div></section>
    <section><h2 className="font-display text-3xl text-cocoa-950">Appointments</h2><div className="mt-4 space-y-4">{order.Segments.map((segment) => <article key={segment.id} className="rounded-2xl border border-sand-200 bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-display text-2xl text-cocoa-950">{segment.offering.name}</h3><p className="mt-1 text-cocoa-700">{dateTime.format(segment.startsAt)}</p><p className="mt-1 text-sm text-cocoa-600">{segment.location.name}{segment.membership?.user.name ? ` · With ${segment.membership.user.name}` : ''}</p></div><span className="h-fit rounded-full bg-sand-100 px-3 py-1 text-xs font-bold uppercase text-cocoa-700">{segment.status.replaceAll('_', ' ')}</span></div></article>)}</div></section>
    {intakeDefinition.length > 0 && <section className="rounded-3xl border border-sand-200 bg-white p-6"><h2 className="font-display text-3xl text-cocoa-950">Intake responses</h2><dl className="mt-5 grid gap-4">{intakeDefinition.map((question) => <div key={question.id} className="rounded-xl bg-cream-50 p-4"><dt className="text-sm font-semibold text-cocoa-700">{question.label}{question.sensitive ? ' · Sensitive' : ''}</dt><dd className="mt-1 whitespace-pre-wrap text-cocoa-950">{String(order.intakeAnswers[String(question.id)] ?? 'No answer')}</dd></div>)}</dl></section>}
    {order.viewerRole === 'STAFF' && <aside className="rounded-2xl bg-sand-100 p-5 text-sm text-cocoa-700">Only appointments assigned to you are shown. Customer information is provided solely to deliver this service.</aside>}
  </div>
}
