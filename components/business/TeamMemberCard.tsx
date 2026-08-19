'use client'

import type { BusinessRole } from '@prisma/client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { TeamAction, TeamActionResult, TeamLocationOption, TeamQualificationOption } from './TeamInvitationForm'

export type ManagedTeamMemberView = {
  id: string
  name: string
  email: string
  role: BusinessRole
  active: boolean
  locations: TeamLocationOption[]
  qualifications: TeamQualificationOption[]
}

const labels: Record<BusinessRole, string> = { OWNER: 'Owner', MANAGER: 'Manager', ACCOUNTS: 'Accounts', STAFF: 'Staff' }

export function TeamMemberCard({ actorRole, member, locations, qualificationOptions, action }: { actorRole: 'OWNER' | 'MANAGER'; member: ManagedTeamMemberView; locations: TeamLocationOption[]; qualificationOptions: TeamQualificationOption[]; action: TeamAction }) {
  const [active, setActive] = useState(member.active)
  const [role, setRole] = useState<BusinessRole>(member.role)
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<TeamActionResult | null>(null)
  const manageable = actorRole === 'OWNER' || member.role === 'STAFF'
  const roles: BusinessRole[] = actorRole === 'OWNER' ? (member.role === 'OWNER' ? ['OWNER', 'MANAGER', 'ACCOUNTS', 'STAFF'] : ['MANAGER', 'ACCOUNTS', 'STAFF']) : ['STAFF']

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    formData.set('membershipId', member.id)
    formData.set('active', String(active))
    setPending(true)
    setResult(null)
    try { setResult(await action(formData)) } catch { setResult({ ok: false, error: 'Unable to update member access.' }) } finally { setPending(false) }
  }

  async function toggleActive() {
    const nextActive = !active
    if (!nextActive && !window.confirm(`Deactivate ${member.name}? Historical assignments will be retained.`)) return
    const formData = new FormData()
    formData.set('membershipId', member.id)
    formData.set('role', member.role)
    formData.set('active', String(nextActive))
    for (const location of member.locations) formData.append('locationIds', location.id)
    for (const qualification of member.qualifications) formData.append('qualifications', `${qualification.offeringId}|${qualification.locationId}`)
    setPending(true)
    try {
      const next = await action(formData)
      setResult(next)
      if (next.ok) setActive(nextActive)
    } catch { setResult({ ok: false, error: 'Unable to change member status.' }) } finally { setPending(false) }
  }

  return <article className="space-y-4 rounded-3xl border border-sand-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-display text-2xl text-cocoa-950">{member.name}</h3><p className="text-sm text-cocoa-600">{member.email}</p><p className="mt-1 text-sm font-semibold text-cocoa-800">{labels[member.role]}</p></div><StatusBadge tone={active ? 'success' : 'neutral'}>{active ? 'Active' : 'Inactive'}</StatusBadge></div>
    <p className="text-sm text-cocoa-700">Locations: {member.locations.map(({ name }) => name).join(', ') || 'No location assigned'}</p>
    {member.role === 'STAFF' ? <p className="text-sm text-cocoa-700">Qualifications: {member.qualifications.map(({ offeringName, locationName }) => `${offeringName} at ${locationName}`).join(', ') || 'No service qualifications'}</p> : null}
    {manageable ? <>
      <Button type="button" variant="secondary" disabled={pending} onClick={toggleActive}>{active ? `Deactivate ${member.name}` : `Reactivate ${member.name}`}</Button>
      <details className="rounded-2xl border border-sand-200 p-4"><summary className="cursor-pointer font-semibold text-cocoa-900">Edit access</summary><form onSubmit={submit} className="mt-4 space-y-4">
        <label className="block text-sm font-semibold" htmlFor={`role-${member.id}`}>Role<select id={`role-${member.id}`} name="role" value={role} onChange={(event) => setRole(event.target.value as BusinessRole)} className="mt-1 min-h-11 w-full rounded-xl border border-sand-300 bg-white px-3">{roles.map((option) => <option key={option} value={option}>{labels[option]}</option>)}</select></label>
        <fieldset><legend className="text-sm font-semibold">Locations</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{locations.map((location) => <label key={location.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="locationIds" value={location.id} defaultChecked={member.locations.some(({ id }) => id === location.id)} />{location.name}</label>)}</div></fieldset>
        {role === 'STAFF' ? <fieldset><legend className="text-sm font-semibold">Service qualifications</legend><div className="mt-2 grid gap-2">{qualificationOptions.map((option) => <label key={`${option.offeringId}:${option.locationId}`} className="flex items-center gap-2 text-sm"><input type="checkbox" name="qualifications" value={`${option.offeringId}|${option.locationId}`} defaultChecked={member.qualifications.some((item) => item.offeringId === option.offeringId && item.locationId === option.locationId)} />{option.offeringName} · {option.locationName}</label>)}</div></fieldset> : null}
        <Button type="submit" disabled={pending}>{pending ? 'Saving access…' : 'Save access'}</Button>
      </form></details>
    </> : null}
    {result ? result.ok ? <p role="status" className="text-sm font-semibold text-success">Member access updated.</p> : <p role="alert" className="text-sm font-semibold text-danger">{'error' in result ? result.error : 'Unable to update member access.'}</p> : null}
  </article>
}
