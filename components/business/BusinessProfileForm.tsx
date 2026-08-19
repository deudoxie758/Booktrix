'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import type { ProfileMutationResult } from '@/modules/settings/business-policy'

export type BusinessProfileAction = (formData: FormData) => Promise<ProfileMutationResult>

export type BusinessProfileValues = { name: string; slug: string; description: string | null; phone: string | null; email: string | null }

export function BusinessProfileForm({ profile, action }: { profile: BusinessProfileValues; action: BusinessProfileAction }) {
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<ProfileMutationResult | null>(null)
  const submitting = useRef(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const formData = new FormData(event.currentTarget)
    submitting.current = true
    setPending(true)
    setResult(null)
    try {
      setResult(await action(formData))
    } catch {
      setResult({ ok: false, error: 'Unable to save your business profile. Please try again.' })
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  const errors = result?.ok === false ? result.fieldErrors : undefined
  return (
    <section id="profile" aria-labelledby="profile-heading" className="space-y-5 rounded-3xl border border-sand-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-clay-600">Storefront identity</p>
        <h2 id="profile-heading" className="mt-1 font-display text-2xl text-cocoa-950">Business profile</h2>
        <p className="mt-2 text-sm text-cocoa-600">This is the public name, slug, description, and contact details shown on your marketplace storefront.</p>
      </div>
      <form onSubmit={submit} aria-label="Business profile" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field required id="settings-name" name="name" label="Business name" defaultValue={profile.name} error={errors?.name} />
          <Field required id="settings-slug" name="slug" label="Slug" defaultValue={profile.slug} error={errors?.slug} help="Used in your public marketplace URL." />
          <Field id="settings-phone" name="phone" type="tel" label="Phone" defaultValue={profile.phone ?? ''} error={errors?.phone} />
          <Field id="settings-email" name="email" type="email" label="Email" defaultValue={profile.email ?? ''} error={errors?.email} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-cocoa-900" htmlFor="settings-description">Description</label>
          <textarea id="settings-description" name="description" defaultValue={profile.description ?? ''} rows={4} aria-invalid={Boolean(errors?.description)} aria-describedby={errors?.description ? 'settings-description-error' : undefined} className={`w-full rounded-2xl border bg-white px-4 py-3 text-cocoa-950 outline-none transition placeholder:text-cocoa-400 focus:border-clay-500 focus:ring-4 focus:ring-clay-100 ${errors?.description ? 'border-danger' : 'border-sand-300'}`} />
          {errors?.description ? <p id="settings-description-error" className="text-sm font-medium text-danger">{errors.description}</p> : null}
        </div>
        {result ? result.ok === true
          ? <p role="status" className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">Business profile saved.</p>
          : <p role="alert" tabIndex={-1} className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{result.error}</p>
          : null}
        <Button type="submit" disabled={pending}>{pending ? 'Saving profile…' : 'Save profile'}</Button>
      </form>
    </section>
  )
}
