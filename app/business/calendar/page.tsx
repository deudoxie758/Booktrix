import { BookingAgenda } from '@/components/business/BookingAgenda'
import { BookingEditor } from '@/components/business/BookingEditor'
import { prisma } from '@/lib/prisma'
import { listManagedSegments } from '@/modules/bookings/management'
import { requireWorkspaceRole } from '@/modules/organizations/context'
import { createManagedBookingAction, manageBookingSegmentAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function BusinessCalendarPage({ searchParams }: { searchParams: { location?: string; date?: string; staff?: string; service?: string; status?: string } }) {
  const context = await requireWorkspaceRole(['OWNER', 'MANAGER'])
  const location = context.availableLocations.find((item) => item.id === searchParams.location) ?? context.activeLocation ?? context.availableLocations[0]
  if (!location) return <p className="rounded-2xl bg-white p-6">Add an active location to start scheduling.</p>
  const day = searchParams.date ? new Date(`${searchParams.date}T00:00:00-04:00`) : new Date()
  const from = new Date(day); from.setHours(0, 0, 0, 0)
  const to = new Date(from); to.setDate(to.getDate() + 1)
  const [segments, offerings, memberships] = await Promise.all([
    listManagedSegments({ locationId: location.id, from, to, membershipId: searchParams.staff, offeringId: searchParams.service, status: searchParams.status as any }),
    prisma.serviceOffering.findMany({ where: { businessId: context.business.id, active: true, Locations: { some: { locationId: location.id, active: true } } }, orderBy: { name: 'asc' } }),
    prisma.businessMembership.findMany({ where: { businessId: context.business.id, active: true, role: { in: ['OWNER', 'MANAGER', 'STAFF'] }, OR: [{ role: 'OWNER' }, { Locations: { some: { locationId: location.id } } }] }, include: { user: true }, orderBy: { user: { name: 'asc' } } }),
  ])
  return <div className="space-y-8"><header><p className="text-xs font-bold uppercase tracking-[.18em] text-clay-600">Operations</p><h1 className="mt-2 font-display text-4xl text-cocoa-950">Booking calendar</h1><p className="mt-2 text-cocoa-600">Today’s work first, scoped to your assigned location.</p></header><form className="grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-2 lg:grid-cols-6"><Filter label="Location" name="location" value={location.id} options={context.availableLocations} /><label className="text-sm font-semibold">Date<input name="date" type="date" defaultValue={searchParams.date} className="mt-1 w-full rounded-xl border border-sand-300 px-3 py-2" /></label><Filter label="Staff" name="staff" value={searchParams.staff} options={memberships.map(({ id, user }) => ({ id, name: user.name ?? user.email ?? 'Team member' }))} /><Filter label="Service" name="service" value={searchParams.service} options={offerings} /><Filter label="Status" name="status" value={searchParams.status} options={[{ id: 'REQUESTED', name: 'Awaiting approval' }, { id: 'CONFIRMED', name: 'Confirmed' }, { id: 'IN_PROGRESS', name: 'In progress' }, { id: 'COMPLETED', name: 'Completed' }, { id: 'CANCELLED', name: 'Cancelled' }]} /><button className="self-end rounded-full bg-cocoa-900 px-5 py-2.5 text-sm font-semibold text-white">Apply filters</button></form><section><h2 className="mb-4 font-display text-2xl text-cocoa-950">Agenda</h2><BookingAgenda segments={segments} locationId={location.id} action={manageBookingSegmentAction} /></section><BookingEditor action={createManagedBookingAction} locations={context.availableLocations.map(({ id, name }) => ({ id, name }))} offerings={offerings.map(({ id, name }) => ({ id, name }))} staff={memberships.map(({ id, user }) => ({ id, name: user.name ?? user.email ?? 'Team member' }))} /></div>
}

function Filter({ label, name, value, options }: { label: string; name: string; value?: string; options: Array<{ id: string; name: string }> }) { return <label className="text-sm font-semibold">{label}<select name={name} defaultValue={value ?? ''} className="mt-1 w-full rounded-xl border border-sand-300 bg-white px-3 py-2"><option value="">All</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> }
