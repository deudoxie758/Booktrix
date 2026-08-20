'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { LocationAction } from './LocationEditor'
import type { LocationMutationResult, ManagedLocation } from '@/modules/locations/management'

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function clockValue(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
}

export function LocationHoursEditor({ location, action }: { location: ManagedLocation; action: LocationAction }) {
  const initialClosed = weekdays.map((_, weekday) => !location.hours.some((hour) => hour.weekday === weekday))
  const [closed, setClosed] = useState(initialClosed)
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<LocationMutationResult | null>(null)
  const submitting = useRef(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const formData = new FormData(event.currentTarget)
    submitting.current = true
    setPending(true)
    setResult(null)
    formData.set('locationId', location.id)
    try {
      setResult(await action(formData))
    } catch {
      setResult({ ok: false, error: 'Unable to save opening hours. Please try again.' })
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  const errors = result?.ok === false ? result.fieldErrors : undefined
  return (
    <form onSubmit={submit} aria-label={`${location.name} weekly hours`} className="space-y-4 rounded-3xl border border-sand-200 bg-cream-50 p-4 sm:p-5">
      <div>
        <h3 className="font-display text-xl text-cocoa-950">Weekly opening hours</h3>
        <p className="mt-1 text-sm text-cocoa-600">Closed is submitted explicitly; stored open intervals determine the public schedule.</p>
      </div>
      <div className="space-y-3">
        {weekdays.map((day, weekday) => {
          const hours = location.hours.find((hour) => hour.weekday === weekday)
          return (
            <fieldset key={day} className="grid gap-3 rounded-2xl border border-sand-200 bg-white p-3 sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)]" aria-describedby={errors?.[`hours.${weekday}.opensAt`] || errors?.[`hours.${weekday}.closesAt`] ? `hours-${weekday}-error` : undefined}>
              <legend className="sr-only">{day}</legend>
              <label className="flex items-center gap-2 text-sm font-semibold text-cocoa-900">
                <input type="checkbox" name={`hours.${weekday}.closed`} defaultChecked={initialClosed[weekday]} onChange={(event) => setClosed((current) => current.map((value, index) => index === weekday ? event.target.checked : value))} />
                {day} closed
              </label>
              <label className="text-sm font-semibold text-cocoa-900">{day} opens
                <input className="mt-1 min-h-11 w-full rounded-xl border border-sand-300 bg-white px-3" disabled={closed[weekday]} required={!closed[weekday]} name={`hours.${weekday}.opensAt`} type="time" defaultValue={hours ? clockValue(hours.startMinute) : '09:00'} />
              </label>
              <label className="text-sm font-semibold text-cocoa-900">{day} closes
                <input className="mt-1 min-h-11 w-full rounded-xl border border-sand-300 bg-white px-3" disabled={closed[weekday]} required={!closed[weekday]} name={`hours.${weekday}.closesAt`} type="time" defaultValue={hours ? clockValue(hours.endMinute) : '17:00'} />
              </label>
              {errors?.[`hours.${weekday}.opensAt`] || errors?.[`hours.${weekday}.closesAt`]
                ? <p id={`hours-${weekday}-error`} className="text-sm font-semibold text-danger sm:col-span-3">{errors[`hours.${weekday}.opensAt`] ?? errors[`hours.${weekday}.closesAt`]}</p>
                : null}
            </fieldset>
          )
        })}
      </div>
      {result ? result.ok === true
        ? <p role="status" className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">Opening hours saved.</p>
        : <p role="alert" tabIndex={-1} className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{result.error}</p>
        : null}
      <Button type="submit" disabled={pending}>{pending ? 'Saving hours…' : 'Save opening hours'}</Button>
    </form>
  )
}
