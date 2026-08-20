'use client'

import type { FormEvent } from 'react'
import { StatusBadge } from '@/components/ui/StatusBadge'

type AgendaSegment = {
  id: string
  startsAt: Date | string
  status: string
  order: { customerName?: string | null; customer?: { name?: string | null } | null }
  offering: { name: string }
  location: { name: string }
  membership?: { user?: { name?: string | null } | null } | null
}

const time = new Intl.DateTimeFormat('en-LC', { hour: 'numeric', minute: '2-digit', timeZone: 'America/St_Lucia' })

const statusLabel: Record<string, string> = { REQUESTED: 'Awaiting approval', CONFIRMED: 'Confirmed', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled', REJECTED: 'Rejected', NO_SHOW: 'No-show' }

const operations: Record<string, Array<{ label: string; status: string }>> = {
  REQUESTED: [{ label: 'Approve', status: 'CONFIRMED' }, { label: 'Reject', status: 'REJECTED' }, { label: 'Cancel', status: 'CANCELLED' }],
  CONFIRMED: [{ label: 'Start', status: 'IN_PROGRESS' }, { label: 'No-show', status: 'NO_SHOW' }, { label: 'Cancel', status: 'CANCELLED' }],
  IN_PROGRESS: [{ label: 'Complete', status: 'COMPLETED' }, { label: 'Cancel', status: 'CANCELLED' }],
}

export function BookingAgenda({ segments, locationId, action }: { segments: AgendaSegment[]; locationId?: string; action?: (formData: FormData) => void | Promise<void> }) {
  if (!segments.length) return <div className="rounded-3xl border border-dashed border-sand-300 bg-white/60 p-10 text-center text-cocoa-600">No appointments match these filters.</div>
  return <div className="space-y-3" aria-label="Booking agenda">{segments.map((segment) => {
    const customerName = segment.order.customer?.name || segment.order.customerName || 'Walk-in customer'
    return <article key={segment.id} className="grid gap-3 rounded-2xl border border-sand-200 bg-white p-4 shadow-sm sm:grid-cols-[6rem_1fr_auto] sm:items-center">
      <p className="font-display text-xl text-cocoa-950">{time.format(new Date(segment.startsAt))}</p>
      <div><h3 className="font-semibold text-cocoa-950">{customerName}</h3><p className="text-sm font-medium text-cocoa-700">{segment.offering.name}</p><p className="text-xs text-cocoa-500">{segment.location.name}</p>{segment.membership?.user?.name && <p className="text-xs text-cocoa-500">With {segment.membership.user.name}</p>}</div>
      <div className="flex flex-wrap items-center gap-2"><StatusBadge tone={segment.status === 'CONFIRMED' ? 'success' : segment.status === 'REQUESTED' ? 'warning' : ['CANCELLED', 'REJECTED', 'NO_SHOW'].includes(segment.status) ? 'danger' : 'neutral'}>{statusLabel[segment.status] ?? segment.status}</StatusBadge>{action && locationId && operations[segment.status]?.map((operation) => <form onSubmit={async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); await action(new FormData(event.currentTarget)) }} key={operation.status}><input type="hidden" name="segmentId" value={segment.id} /><input type="hidden" name="locationId" value={locationId} /><input type="hidden" name="status" value={operation.status} /><button className="rounded-full border border-sand-300 px-3 py-1 text-xs font-semibold text-cocoa-800" type="submit">{operation.label}</button></form>)}</div>
    </article>
  })}</div>
}
