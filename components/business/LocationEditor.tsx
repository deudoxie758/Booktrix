'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import type { LocationMutationResult, ManagedLocation } from '@/modules/locations/management'

export type LocationAction = (formData: FormData) => Promise<LocationMutationResult>

export function LocationEditor({ mode, location, action }: { mode: 'create' | 'edit'; location?: ManagedLocation; action: LocationAction }) {
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<LocationMutationResult | null>(null)
  const submitting = useRef(false)
  const isCreate = mode === 'create'

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const formData = new FormData(event.currentTarget)
    submitting.current = true
    setPending(true)
    setResult(null)
    if (location) formData.set('locationId', location.id)
    try {
      setResult(await action(formData))
    } catch {
      setResult({ ok: false, error: 'Unable to save the location. Please try again.' })
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  const errors = result?.ok === false ? result.fieldErrors : undefined
  return (
    <form onSubmit={submit} aria-label={isCreate ? 'Add location' : `Edit ${location?.name ?? 'location'}`} className="space-y-5 rounded-3xl border border-sand-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-clay-600">{isCreate ? 'New workspace' : 'Location details'}</p>
        <h2 className="mt-1 font-display text-2xl text-cocoa-950">{isCreate ? 'Add a location' : `Edit ${location?.name ?? 'location'}`}</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field required id={`${location?.id ?? 'new-location'}-name`} label="Location name" name="name" defaultValue={location?.name} error={errors?.name} />
        <Field required id={`${location?.id ?? 'new-location'}-slug`} label="Slug" name="slug" defaultValue={location?.slug} error={errors?.slug} help="Used in the location’s public URL." />
        <Field required id={`${location?.id ?? 'new-location'}-address`} label="Address" name="address" defaultValue={location?.address ?? ''} error={errors?.address} className="sm:col-span-2" />
        <Field id={`${location?.id ?? 'new-location'}-phone`} label="Phone" name="phone" type="tel" defaultValue={location?.phone ?? ''} error={errors?.phone} />
        <Field id={`${location?.id ?? 'new-location'}-email`} label="Email" name="email" type="email" defaultValue={location?.email ?? ''} error={errors?.email} />
      </div>
      {result ? result.ok === true
        ? <p role="status" className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">{isCreate ? 'Location added successfully.' : 'Location updated successfully.'}</p>
        : <p role="alert" tabIndex={-1} className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{result.error}</p>
        : null}
      <Button type="submit" disabled={pending}>{pending ? 'Saving location…' : isCreate ? 'Add location' : 'Save location'}</Button>
    </form>
  )
}
