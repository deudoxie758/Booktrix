'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { TeamAction, TeamActionResult } from './TeamInvitationForm'

export type PendingInvitationView = {
  id: string
  invitedName: string
  normalizedEmail: string
  role: 'MANAGER' | 'ACCOUNTS' | 'STAFF'
  expiresAt: Date
  locations: Array<{ id: string; name: string }>
  qualifications: Array<{ offeringId: string; offeringName: string; locationId: string; locationName: string }>
}

export function PendingInvitationCard({ invitation, resendAction, revokeAction }: { invitation: PendingInvitationView; resendAction: TeamAction; revokeAction: TeamAction }) {
  const [pending, setPending] = useState(false)
  const [revoked, setRevoked] = useState(false)
  const [result, setResult] = useState<TeamActionResult | null>(null)
  const submitting = useRef(false)

  async function resend(copy: boolean) {
    if (submitting.current) return
    submitting.current = true
    setPending(true)
    setResult(null)
    const formData = new FormData()
    formData.set('invitationId', invitation.id)
    try {
      const next = await resendAction(formData)
      if (next.ok && copy && next.invitationUrl) {
        try {
          await navigator.clipboard?.writeText(next.invitationUrl)
          setResult({ ...next, invitationUrl: undefined })
        } catch {
          setResult(next)
        }
      } else setResult(next)
    } catch {
      setResult({ ok: false, error: 'Unable to rotate the invitation link.' })
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  async function revoke() {
    if (!window.confirm(`Revoke the invitation for ${invitation.invitedName}?`)) return
    const formData = new FormData()
    formData.set('invitationId', invitation.id)
    setPending(true)
    try {
      const next = await revokeAction(formData)
      setResult(next)
      if (next.ok) setRevoked(true)
    } catch {
      setResult({ ok: false, error: 'Unable to revoke the invitation.' })
    } finally {
      setPending(false)
    }
  }

  if (revoked) return <p role="status" className="rounded-2xl bg-sand-100 p-4 text-sm font-semibold text-cocoa-700">Invitation for {invitation.invitedName} revoked.</p>
  return <article className="space-y-4 rounded-3xl border border-sand-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-display text-2xl text-cocoa-950">{invitation.invitedName}</h3><p className="text-sm text-cocoa-600">{invitation.normalizedEmail}</p></div><StatusBadge tone="warning">{invitation.role}</StatusBadge></div>
    <p className="text-sm text-cocoa-600">Expires {new Intl.DateTimeFormat('en-LC', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/St_Lucia' }).format(invitation.expiresAt)}</p>
    <p className="text-sm text-cocoa-700">Locations: {invitation.locations.map(({ name }) => name).join(', ') || 'None assigned'}</p>
    {invitation.qualifications.length ? <p className="text-sm text-cocoa-700">Qualifications: {invitation.qualifications.map(({ offeringName, locationName }) => `${offeringName} at ${locationName}`).join(', ')}</p> : null}
    <div className="flex flex-wrap gap-2"><Button type="button" disabled={pending} onClick={() => resend(true)}>Copy invitation link</Button><Button type="button" variant="secondary" disabled={pending} onClick={() => resend(false)}>Resend invitation</Button><Button type="button" variant="ghost" disabled={pending} onClick={revoke}>Revoke invitation</Button></div>
    {result ? result.ok
      ? <div role="status" className="rounded-2xl bg-success/10 px-4 py-3 text-sm font-semibold text-success">{result.invitationUrl ? <>Invitation resent. New one-time link: <span className="break-all font-mono font-normal text-cocoa-800">{result.invitationUrl}</span></> : 'New invitation link copied.'}</div>
      : <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{'error' in result ? result.error : 'Unable to update the invitation.'}</p>
      : null}
  </article>
}
