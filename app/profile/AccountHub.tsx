import Link from 'next/link'

import { SignOutButton } from '@/components/auth/SignOutButton'
import { CustomerBookingCard } from '@/components/booking/CustomerBookingCard'
import type { AccountHubModel } from '@/modules/profile/account-hub'
import { workspaceSelectionHref } from '@/modules/organizations/workspace-selection'

const money = new Intl.NumberFormat('en-LC', { style: 'currency', currency: 'XCD' })
const appointment = new Intl.DateTimeFormat('en-LC', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/St_Lucia' })

export function AccountHub({ hub }: { hub: AccountHubModel }) {
  return <main className="min-h-screen bg-cream-100 px-5 py-8 sm:px-8 sm:py-12"><div className="mx-auto max-w-6xl space-y-10">
    <header className="overflow-hidden rounded-[2rem] bg-cocoa-950 px-6 py-8 text-cream-50 shadow-soft sm:px-9 sm:py-10"><div className="flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-5"><div aria-hidden="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-clay-500 text-2xl font-bold text-white sm:h-20 sm:w-20">{hub.identity.initial}</div><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[.2em] text-sand-200">My account</p><h1 className="mt-2 font-display text-4xl sm:text-5xl">Your Booktrix account</h1><p className="mt-2 truncate text-sm text-cream-100/75">{hub.identity.name} · {hub.identity.email}</p></div></div>
      <div className="flex flex-wrap gap-3"><Link href="/profile/bookings" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-cocoa-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400">View all bookings</Link><Link href="/search" className="rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400">Discover services</Link><SignOutButton tone="account" /></div>
    </div></header>

    <section aria-labelledby="customer-summary-heading"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-clay-600">Bookings</p><h2 id="customer-summary-heading" className="mt-1 font-display text-3xl text-cocoa-950">Your appointments</h2></div><span className="rounded-full bg-sand-100 px-3 py-1.5 text-xs font-semibold text-cocoa-700">{hub.identity.points} points</span></div>
      <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Total bookings" value={String(hub.customer.stats.total)} /><Stat label="Upcoming" value={String(hub.customer.stats.upcoming)} /><Stat label="Completed" value={String(hub.customer.stats.completed)} /><Stat label="Recorded spend" value={money.format(hub.customer.stats.spentCents / 100)} /></dl>
      {hub.customer.nextAppointment ? <article className="mt-5 rounded-3xl border border-sand-200 bg-white p-5 shadow-soft sm:p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-clay-600">Next appointment</p><div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="font-display text-2xl text-cocoa-950">{hub.customer.nextAppointment.serviceName}</h3><p className="mt-2 font-semibold text-cocoa-800">{appointment.format(hub.customer.nextAppointment.startsAt)}</p><p className="mt-1 text-sm text-cocoa-600">{hub.customer.nextAppointment.businessName} · {hub.customer.nextAppointment.locationName}{hub.customer.nextAppointment.professionalName ? ` · With ${hub.customer.nextAppointment.professionalName}` : ''}</p></div><Link href={`/profile/bookings/${hub.customer.nextAppointment.orderId}`} className="self-start rounded-full bg-cocoa-900 px-5 py-2.5 text-sm font-semibold text-white sm:self-auto">View appointment</Link></div></article> : <div className="mt-5 rounded-3xl border border-dashed border-sand-300 bg-white/60 px-6 py-9 text-center text-cocoa-600"><p className="font-semibold text-cocoa-900">Nothing booked yet</p><p className="mt-1 text-sm">Your next appointment will appear here as soon as you book.</p></div>}
    </section>

    {(hub.workspaces.length > 0 || hub.platformWorkspace) && <section aria-labelledby="workspaces-heading"><p className="text-xs font-bold uppercase tracking-[.18em] text-clay-600">Role-aware access</p><h2 id="workspaces-heading" className="mt-1 font-display text-3xl text-cocoa-950">Your workspaces</h2><p className="mt-2 max-w-2xl text-sm text-cocoa-600">Choose the part of Booktrix you need. Your customer bookings remain available from this account.</p><div className="mt-5 grid gap-5 lg:grid-cols-2">
      {hub.workspaces.map((workspace) => <WorkspaceCard key={workspace.membershipId} workspace={workspace} />)}
      {hub.platformWorkspace && <article className="rounded-3xl border border-sand-200 bg-cocoa-900 p-6 text-white shadow-soft"><p className="text-xs font-bold uppercase tracking-[.16em] text-sand-200">Platform administrator</p><h3 className="mt-2 font-display text-2xl">Booktrix administration</h3><p className="mt-4 text-sm text-cream-100/75">{hub.platformWorkspace.businesses} businesses · {hub.platformWorkspace.applicationsAwaitingReview} awaiting review</p><Link href={hub.platformWorkspace.href} className="mt-6 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-cocoa-950">Open admin workspace</Link></article>}
    </div></section>}

    <section aria-labelledby="recent-heading"><div className="flex items-end justify-between gap-4"><h2 id="recent-heading" className="font-display text-3xl text-cocoa-950">Recent bookings</h2>{hub.customer.recentOrders.length > 0 && <Link href="/profile/bookings" className="text-sm font-semibold text-clay-600">See all</Link>}</div><div className="mt-5 grid gap-5">{hub.customer.recentOrders.length ? hub.customer.recentOrders.map((order) => <CustomerBookingCard key={order.id} order={order} />) : <div className="rounded-3xl border border-dashed border-sand-300 bg-white/60 px-6 py-9 text-center text-sm text-cocoa-600">Bookings made through the revised Booktrix checkout will appear here.</div>}</div></section>
  </div></main>
}

function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-sand-200 bg-white p-4 shadow-sm"><dt className="text-xs font-semibold uppercase tracking-wide text-cocoa-500">{label}</dt><dd className="mt-2 text-2xl font-bold text-cocoa-950">{value}</dd></div> }

function WorkspaceCard({ workspace }: { workspace: AccountHubModel['workspaces'][number] }) {
  const operational = workspace.role === 'OWNER' || workspace.role === 'MANAGER'
  const staff = workspace.role === 'STAFF'
  return <article className="rounded-3xl border border-sand-200 bg-white p-6 shadow-soft"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-clay-600">{workspace.label} workspace</p><h3 className="mt-2 font-display text-2xl text-cocoa-950">{workspace.businessName}</h3></div><span className="rounded-full bg-sand-100 px-3 py-1 text-xs font-semibold capitalize text-cocoa-700">{workspace.businessStatus.toLowerCase().replace('_', ' ')}</span></div>
    {operational && <dl className="mt-5 grid grid-cols-3 gap-2"><MiniStat label="Today" value={workspace.todayAppointments} /><MiniStat label="Pending" value={workspace.pendingApprovals} /><MiniStat label="Team" value={workspace.activeTeamCount} /></dl>}
    {staff && <dl className="mt-5 grid grid-cols-2 gap-2"><MiniStat label="Assigned today" value={workspace.assignedToday} /><MiniStat label="Upcoming" value={workspace.assignedUpcoming} /></dl>}
    {workspace.role === 'ACCOUNTS' && <><dl className="mt-5 grid grid-cols-2 gap-2"><MiniStat label="Recorded payments" value={money.format(workspace.recordedPaidCents / 100)} /><MiniStat label="Due at visits" value={money.format(workspace.dueAtAppointmentCents / 100)} /></dl><p className="mt-3 text-xs text-cocoa-500">These figures reflect recorded bookings. Online payment processing is not enabled yet.</p></>}
    <Link href={workspaceSelectionHref(workspace.businessId)} className="mt-6 inline-flex rounded-full bg-cocoa-900 px-5 py-2.5 text-sm font-semibold text-white">Open {workspace.businessName} {workspace.role === 'STAFF' ? 'schedule' : workspace.role === 'ACCOUNTS' ? 'finance' : 'calendar'}</Link>
  </article>
}

function MiniStat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-2xl bg-cream-100 p-3"><dt className="text-[.65rem] font-bold uppercase tracking-wide text-cocoa-500">{label}</dt><dd className="mt-1 font-semibold text-cocoa-950">{value}</dd></div> }
