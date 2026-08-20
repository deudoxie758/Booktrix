'use client'

import type { BusinessRole } from '@prisma/client'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'

export type TeamLocationOption = { id: string; name: string }
export type TeamQualificationOption = { offeringId: string; offeringName: string; locationId: string; locationName: string }
export type TeamActionResult = { ok: true; invitationId?: string; membershipId?: string; invitationUrl?: string } | { ok: false; error: string; fieldErrors?: Record<string, string> }
export type TeamAction = (formData: FormData) => Promise<TeamActionResult>

const roleLabels: Record<BusinessRole, string> = { OWNER: 'Owner', MANAGER: 'Manager', ACCOUNTS: 'Accounts', STAFF: 'Staff' }

async function copyUrl(url: string) {
  await navigator.clipboard?.writeText(url)
}

export function TeamInvitationForm({ role, locations, qualificationOptions, action }: { role: 'OWNER' | 'MANAGER'; locations: TeamLocationOption[]; qualificationOptions: TeamQualificationOption[]; action: TeamAction }) {
  const roles: BusinessRole[] = role === 'OWNER' ? ['MANAGER', 'ACCOUNTS', 'STAFF'] : ['STAFF']
  const [requestedRole, setRequestedRole] = useState<BusinessRole>(roles[0])
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<TeamActionResult | null>(null)
  const submitting = useRef(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true
    setPending(true)
    setResult(null)
    try {
      setResult(await action(new FormData(event.currentTarget)))
    } catch {
      setResult({ ok: false, error: 'Unable to create the invitation. Please try again.' })
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  return <form aria-label="Invite team member" onSubmit={submit} className="space-y-5 rounded-3xl border border-sand-200 bg-white p-5 shadow-sm sm:p-6">
    <div><p className="text-xs font-bold uppercase tracking-[.16em] text-clay-600">Secure invitation</p><h2 className="mt-1 font-display text-2xl text-cocoa-950">Invite a team member</h2><p className="mt-1 text-sm text-cocoa-600">Links expire after seven days. The plaintext link appears only when it is created or rotated.</p></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field required id="invitation-name" name="name" label="Name" autoComplete="name" />
      <Field required id="invitation-email" name="email" label="Email" type="email" autoComplete="email" />
    </div>
    <label className="block text-sm font-semibold text-cocoa-900" htmlFor="invitation-role">Role
      <select id="invitation-role" name="role" value={requestedRole} onChange={(event) => setRequestedRole(event.target.value as BusinessRole)} className="mt-2 min-h-12 w-full rounded-2xl border border-sand-300 bg-white px-4">
        {roles.map((option) => <option key={option} value={option}>{roleLabels[option]}</option>)}
      </select>
    </label>
    <fieldset className="space-y-2"><legend className="text-sm font-semibold text-cocoa-900">Initial locations</legend><div className="grid gap-2 sm:grid-cols-2">{locations.map((location) => <label key={location.id} className="flex items-center gap-2 rounded-2xl border border-sand-200 p-3 text-sm"><input type="checkbox" name="locationIds" value={location.id} />{location.name}</label>)}</div></fieldset>
    {requestedRole === 'STAFF' ? <fieldset className="space-y-2"><legend className="text-sm font-semibold text-cocoa-900">Optional service qualifications</legend><div className="grid gap-2">{qualificationOptions.map((option) => <label key={`${option.offeringId}:${option.locationId}`} className="flex items-center gap-2 rounded-2xl border border-sand-200 p-3 text-sm"><input type="checkbox" name="qualifications" value={`${option.offeringId}|${option.locationId}`} />{option.offeringName} · {option.locationName}</label>)}</div></fieldset> : null}
    {result ? result.ok
      ? <div role="status" className="space-y-2 rounded-2xl bg-success/10 px-4 py-3 text-sm font-semibold text-success"><p>Invitation created. Copy this one-time link now:</p><p className="break-all font-mono font-normal text-cocoa-800">{result.invitationUrl}</p>{result.invitationUrl ? <Button type="button" variant="secondary" onClick={() => copyUrl(result.invitationUrl!)}>Copy invitation link</Button> : null}</div>
      : <p role="alert" tabIndex={-1} className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{'error' in result ? result.error : 'Unable to create the invitation.'}</p>
      : null}
    <Button type="submit" disabled={pending}>{pending ? 'Sending invitation…' : 'Send invitation'}</Button>
  </form>
}
