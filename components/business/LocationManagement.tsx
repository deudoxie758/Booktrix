'use client'

import type { BusinessRole } from '@prisma/client'
import type { ManagedLocation } from '@/modules/locations/management'
import { LocationCard } from './LocationCard'
import { LocationEditor, type LocationAction } from './LocationEditor'

export type LocationManagementActions = {
  createLocation: LocationAction
  updateLocation: LocationAction
  setHours: LocationAction
  setActive: LocationAction
}

export function LocationManagement({ role, locations, actions }: { role: BusinessRole; locations: ManagedLocation[]; actions: LocationManagementActions }) {
  const editable = role === 'OWNER' || role === 'MANAGER'
  return (
    <div className="space-y-8">
      {!editable ? <p className="rounded-2xl border border-sand-200 bg-sand-50 px-4 py-3 text-sm font-semibold text-cocoa-700">You have read-only access to your assigned locations.</p> : null}
      <div className="grid gap-5 lg:grid-cols-2">
        {locations.map((location) => <LocationCard key={location.id} role={role} location={location} updateAction={actions.updateLocation} hoursAction={actions.setHours} activeAction={actions.setActive} />)}
      </div>
      {editable ? <LocationEditor mode="create" action={actions.createLocation} /> : null}
    </div>
  )
}
