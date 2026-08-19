'use client'

import type { BusinessRole } from '@prisma/client'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { LocationMutationResult, ManagedLocation } from '@/modules/locations/management'
import { LocationEditor, type LocationAction } from './LocationEditor'
import { LocationHoursEditor } from './LocationHoursEditor'

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function clockValue(minute: number) {
  const hour = Math.floor(minute / 60)
  const suffix = hour >= 12 ? 'pm' : 'am'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${String(minute % 60).padStart(2, '0')} ${suffix}`
}

function plural(count: number, singular: string, pluralValue: string) {
  return `${count} ${count === 1 ? singular : pluralValue}`
}

function ActiveControl({ location, active, action, onChanged }: { location: ManagedLocation; active: boolean; action: LocationAction; onChanged(active: boolean): void }) {
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<LocationMutationResult | null>(null)
  const submitting = useRef(false)
  const nextActive = !active

  async function changeActive() {
    const verb = nextActive ? 'activate' : 'deactivate'
    if (!window.confirm(`Are you sure you want to ${verb} ${location.name}? Historical bookings will be retained.`)) return
    if (submitting.current) return
    submitting.current = true
    setPending(true)
    setResult(null)
    const formData = new FormData()
    formData.set('locationId', location.id)
    formData.set('active', String(nextActive))
    try {
      const nextResult = await action(formData)
      setResult(nextResult)
      if (nextResult.ok) onChanged(nextActive)
    } catch {
      setResult({ ok: false, error: `Unable to ${verb} the location. Please try again.` })
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  return <div className="space-y-2">
    <Button type="button" variant="secondary" disabled={pending} onClick={changeActive}>{pending ? 'Saving status…' : nextActive ? 'Activate location' : 'Deactivate location'}</Button>
    {result ? result.ok === true
      ? <p role="status" className="text-sm font-semibold text-success">Location {active ? 'activated' : 'deactivated'}.</p>
      : <p role="alert" tabIndex={-1} className="text-sm font-semibold text-danger">{result.error}</p>
      : null}
  </div>
}

export function LocationCard({ role, location, updateAction, hoursAction, activeAction }: { role: BusinessRole; location: ManagedLocation; updateAction: LocationAction; hoursAction: LocationAction; activeAction: LocationAction }) {
  const editable = role === 'OWNER' || role === 'MANAGER'
  const [active, setActive] = useState(location.isActive)
  useEffect(() => setActive(location.isActive), [location.isActive])
  return (
    <article className="space-y-5 rounded-3xl border border-sand-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-clay-600">/{location.slug}</p>
          <h2 className="mt-1 font-display text-2xl text-cocoa-950">{location.name}</h2>
          <p className="mt-2 text-sm text-cocoa-600">{location.address ?? 'Address not set'}</p>
          {location.phone ? <p className="mt-1 text-sm text-cocoa-600">{location.phone}</p> : null}
          {location.email ? <p className="mt-1 text-sm text-cocoa-600">{location.email}</p> : null}
        </div>
        <StatusBadge tone={active ? 'success' : 'neutral'}>{active ? 'Active' : 'Inactive'}</StatusBadge>
      </div>
      <div className="flex flex-wrap gap-2 text-sm font-semibold text-cocoa-700">
        <span className="rounded-full bg-sand-100 px-3 py-1.5">{plural(location.serviceCount, 'service', 'services')}</span>
        <span className="rounded-full bg-sand-100 px-3 py-1.5">{plural(location.teamCount, 'team member', 'team members')}</span>
      </div>
      <div>
        <h3 className="text-sm font-bold uppercase tracking-[.12em] text-cocoa-700">Opening hours</h3>
        <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          {weekdays.map((day, weekday) => {
            const hour = location.hours.find((item) => item.weekday === weekday)
            return <div key={day} className="flex justify-between gap-3"><dt className="font-semibold">{day}</dt><dd className="text-cocoa-600">{hour ? `${clockValue(hour.startMinute)} – ${clockValue(hour.endMinute)}` : 'Closed'}</dd></div>
          })}
        </dl>
      </div>
      {editable ? <>
        <ActiveControl location={location} active={active} action={activeAction} onChanged={setActive} />
        <details open className="rounded-2xl border border-sand-200 p-4">
          <summary className="cursor-pointer font-semibold text-cocoa-900">Edit location and hours</summary>
          <div className="mt-4 space-y-5">
            <LocationEditor mode="edit" location={location} action={updateAction} />
            <LocationHoursEditor location={location} action={hoursAction} />
          </div>
        </details>
      </> : null}
    </article>
  )
}
