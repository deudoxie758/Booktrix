import Link from 'next/link'

import { BookingStatus } from './BookingStatus'

type CustomerOrder = {
  id: string
  status: string
  subtotalCents: number
  dueOnlineCents: number
  dueAtAppointmentCents: number
  business: { name: string }
  Segments: Array<{
    id: string
    status: string
    startsAt: Date | string
    offering: { name: string }
    location: { name: string }
    membership?: { user?: { name: string | null } | null } | null
  }>
}

const money = new Intl.NumberFormat('en-LC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatMoney = (cents: number) => `EC$${money.format(cents / 100)}`
const appointmentTime = new Intl.DateTimeFormat('en-LC', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/St_Lucia',
})

export function CustomerBookingCard({ order, detailed = false }: { order: CustomerOrder; detailed?: boolean }) {
  return <article className="rounded-3xl border border-sand-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-clay-600">Booking with</p>
        <h2 className="mt-1 font-display text-2xl text-cocoa-950">{order.business.name}</h2>
      </div>
      <BookingStatus segments={order.Segments} />
    </div>
    <div className="mt-5 space-y-4">
      {order.Segments.map((segment) => <div key={segment.id} className="rounded-2xl bg-cream-100 p-4">
        <p className="font-semibold text-cocoa-950">{segment.offering.name}</p>
        <p className="mt-1 text-sm text-cocoa-700">{appointmentTime.format(new Date(segment.startsAt))} · {segment.location.name}</p>
        {segment.membership?.user?.name && <p className="mt-1 text-sm text-cocoa-600">With {segment.membership.user.name}</p>}
      </div>)}
    </div>
    <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-sand-200 pt-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-cocoa-500">Total</p>
        <p className="text-lg font-bold text-cocoa-950">{formatMoney(order.subtotalCents)}</p>
        {detailed && <p className="text-xs text-cocoa-600">Paid or due online: {formatMoney(order.dueOnlineCents)} · At appointment: {formatMoney(order.dueAtAppointmentCents)}</p>}
      </div>
      {!detailed && <Link href={`/profile/bookings/${order.id}`} className="rounded-full bg-cocoa-900 px-4 py-2 text-sm font-semibold text-white hover:bg-cocoa-800">View booking</Link>}
    </div>
  </article>
}
