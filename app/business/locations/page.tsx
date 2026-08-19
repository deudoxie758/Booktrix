import { LocationManagement } from '@/components/business/LocationManagement'
import { listManagedLocations } from '@/modules/locations/management'
import { requireWorkspaceRole } from '@/modules/organizations/context'
import { createLocationAction, setLocationActiveAction, setLocationHoursAction, updateLocationAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function LocationsPage() {
  const context = await requireWorkspaceRole(['OWNER', 'MANAGER', 'ACCOUNTS'])
  const locations = await listManagedLocations({ actorId: context.actor.id, businessId: context.business.id })
  return <div className="space-y-8">
    <header>
      <p className="text-xs font-bold uppercase tracking-[.18em] text-clay-600">Business footprint</p>
      <h1 className="mt-2 font-display text-4xl text-cocoa-950">Locations</h1>
      <p className="mt-2 max-w-3xl text-cocoa-600">Manage contact details, opening hours, service coverage, and team assignments. Deactivation keeps every historical booking and audit record intact.</p>
    </header>
    <LocationManagement
      role={context.membership.role}
      locations={locations}
      actions={{ createLocation: createLocationAction, updateLocation: updateLocationAction, setHours: setLocationHoursAction, setActive: setLocationActiveAction }}
    />
  </div>
}
