import { NextResponse } from 'next/server'
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

function invitationPath(token: string) {
  return `/invitations/${encodeURIComponent(token)}`
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const token = String(formData.get('token') ?? '')
  if (!token || token.length > 256) return NextResponse.redirect(new URL('/invitations/invalid?error=INVITATION_NOT_FOUND', request.url))
  const actor = await getActor()
  if (!actor) return NextResponse.redirect(new URL(invitationAuthenticationUrls(token).signIn, request.url))

  try {
    await acceptInvitation({ token, actorId: actor.id })
    return NextResponse.redirect(new URL('/business?invitation=accepted', request.url))
  } catch (error) {
    const candidate = error && typeof error === 'object' && 'code' in error ? String(error.code) : error instanceof Error ? error.message : ''
    const code = acceptanceErrors.has(candidate) ? candidate : 'INVITATION_NOT_FOUND'
    return NextResponse.redirect(new URL(`${invitationPath(token)}?error=${encodeURIComponent(code)}`, request.url))
  }
}
