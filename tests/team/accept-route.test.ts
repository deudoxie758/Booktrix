import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getActor: vi.fn(), acceptInvitation: vi.fn() }))
vi.mock('@/modules/identity/session', () => ({ getActor: mocks.getActor }))
vi.mock('@/modules/team/invitations', () => ({ acceptInvitation: mocks.acceptInvitation, invitationAuthenticationUrls: (token: string) => ({ signIn: `/auth/sign-in?callbackUrl=${encodeURIComponent(`/invitations/${token}`)}` }) }))

import { POST } from '@/app/api/team-invitations/accept/route'

function request(token = 'one-time-token') {
  const body = new URLSearchParams({ token })
  return new Request('https://booktrix.test/api/team-invitations/accept', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: body.toString() })
}

describe('team invitation acceptance route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getActor.mockResolvedValue({ id: 'invitee', email: 'invitee@example.com' })
    mocks.acceptInvitation.mockResolvedValue({ businessId: 'business-a', membershipId: 'membership-1', created: true })
  })

  it('returns unauthenticated visitors to sign in with a same-origin invitation callback', async () => {
    mocks.getActor.mockResolvedValue(null)

    const response = await POST(request())

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://booktrix.test/auth/sign-in?callbackUrl=%2Finvitations%2Fone-time-token')
    expect(mocks.acceptInvitation).not.toHaveBeenCalled()
  })

  it('accepts for the authenticated actor and redirects into the business workspace', async () => {
    const response = await POST(request())

    expect(mocks.acceptInvitation).toHaveBeenCalledWith({ token: 'one-time-token', actorId: 'invitee' })
    expect(response.headers.get('location')).toBe('https://booktrix.test/business?invitation=accepted')
  })

  it('returns a safe invitation error without leaking token data', async () => {
    mocks.acceptInvitation.mockRejectedValue(Object.assign(new Error('INVITATION_EMAIL_MISMATCH'), { code: 'INVITATION_EMAIL_MISMATCH' }))

    const response = await POST(request('secret-token'))

    expect(response.headers.get('location')).toBe('https://booktrix.test/invitations/secret-token?error=INVITATION_EMAIL_MISMATCH')
  })
})
