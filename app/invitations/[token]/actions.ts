'use server'

import { redirect } from 'next/navigation'
import { getActor } from '@/modules/identity/session'
import { acceptInvitation, invitationAuthenticationUrls } from '@/modules/team/invitations'

const acceptanceErrors = new Set([
  'INVITATION_NOT_FOUND',
  'INVITATION_EXPIRED',
  'INVITATION_REVOKED',
  'INVITATION_ALREADY_ACCEPTED',
  'INVITATION_EMAIL_MISMATCH',
  'INVITATION_ALREADY_MEMBER',
  'LAST_OWNER_PROTECTED',
])

export async function acceptInvitationAction(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  if (!token || token.length > 256) redirect('/invitations/invalid?error=INVITATION_NOT_FOUND')

  const actor = await getActor()
  if (!actor) redirect(invitationAuthenticationUrls(token).signIn)

  let destination = '/business?invitation=accepted'
  try {
    await acceptInvitation({ token, actorId: actor.id })
  } catch (error) {
    const candidate = error && typeof error === 'object' && 'code' in error ? String(error.code) : error instanceof Error ? error.message : ''
    const code = acceptanceErrors.has(candidate) ? candidate : 'INVITATION_NOT_FOUND'
    destination = `/invitations/${encodeURIComponent(token)}?error=${encodeURIComponent(code)}`
  }
  redirect(destination)
}
