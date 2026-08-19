import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireWorkspaceRole: vi.fn(),
  createInvitation: vi.fn(),
  resendInvitation: vi.fn(),
  revokeInvitation: vi.fn(),
  updateMemberAccess: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('@/modules/organizations/context', () => ({ requireWorkspaceRole: mocks.requireWorkspaceRole }))
vi.mock('@/modules/team/invitations', () => ({ createInvitation: mocks.createInvitation, resendInvitation: mocks.resendInvitation, revokeInvitation: mocks.revokeInvitation }))
vi.mock('@/modules/team/management', () => ({ updateMemberAccess: mocks.updateMemberAccess }))

import { createInvitationAction, resendInvitationAction, revokeInvitationAction, updateMemberAccessAction } from '@/app/business/team/actions'

const context = { actor: { id: 'owner' }, business: { id: 'business-a' }, membership: { role: 'OWNER' } }
const refreshedPaths = ['/business', '/business/team', '/business/schedule', '/business/services']

function createForm() {
  const data = new FormData()
  data.set('name', 'Kai Joseph')
  data.set('email', 'kai@example.com')
  data.set('role', 'STAFF')
  data.append('locationIds', 'castries')
  data.append('qualifications', 'facial|castries')
  return data
}

describe('team server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireWorkspaceRole.mockResolvedValue(context)
    mocks.createInvitation.mockResolvedValue({ id: 'invitation-1', token: 'plaintext-once', email: 'kai@example.com', role: 'STAFF', expiresAt: new Date('2026-08-26T12:00:00Z') })
    mocks.resendInvitation.mockResolvedValue({ id: 'invitation-1', token: 'rotated-once', email: 'kai@example.com', role: 'STAFF', expiresAt: new Date('2026-08-27T12:00:00Z') })
    mocks.revokeInvitation.mockResolvedValue({ id: 'invitation-1', revokedAt: new Date('2026-08-20T12:00:00Z') })
    mocks.updateMemberAccess.mockResolvedValue({ ok: true, membershipId: 'staff-membership' })
  })

  it('requires Owner or Manager before reaching the invitation domain', async () => {
    mocks.requireWorkspaceRole.mockRejectedValue(new Error('BUSINESS_ACCESS_DENIED'))

    await expect(createInvitationAction(createForm())).rejects.toThrow('BUSINESS_ACCESS_DENIED')

    expect(mocks.requireWorkspaceRole).toHaveBeenCalledWith(['OWNER', 'MANAGER'])
    expect(mocks.createInvitation).not.toHaveBeenCalled()
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it('returns the plaintext URL once and revalidates every team access consumer', async () => {
    const result = await createInvitationAction(createForm())

    expect(result).toEqual({ ok: true, invitationId: 'invitation-1', invitationUrl: '/invitations/plaintext-once' })
    expect(mocks.createInvitation).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'owner', businessId: 'business-a', email: 'kai@example.com', role: 'STAFF', locationIds: ['castries'], qualifications: [{ offeringId: 'facial', locationId: 'castries' }] }))
    expect(mocks.revalidatePath.mock.calls.map(([path]) => path)).toEqual(refreshedPaths)
  })

  it.each([
    ['resend', resendInvitationAction, mocks.resendInvitation, true],
    ['revoke', revokeInvitationAction, mocks.revokeInvitation, false],
  ] as const)('%s rechecks workspace access and refreshes consumers', async (_label, action, mutation, hasUrl) => {
    const formData = new FormData()
    formData.set('invitationId', 'invitation-1')

    const result = await action(formData)

    expect(mocks.requireWorkspaceRole).toHaveBeenCalledWith(['OWNER', 'MANAGER'])
    expect(mutation).toHaveBeenCalledWith({ actorId: 'owner', businessId: 'business-a', invitationId: 'invitation-1' })
    expect(result.ok).toBe(true)
    expect(result.ok && Boolean(result.invitationUrl)).toBe(hasUrl)
    expect(mocks.revalidatePath.mock.calls.map(([path]) => path)).toEqual(refreshedPaths)
  })

  it('passes member access through the transaction-bound domain and refreshes consumers', async () => {
    const formData = new FormData()
    formData.set('membershipId', 'staff-membership')
    formData.set('role', 'STAFF')
    formData.set('active', 'true')
    formData.append('locationIds', 'castries')

    const result = await updateMemberAccessAction(formData)

    expect(mocks.updateMemberAccess).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'owner', businessId: 'business-a', membershipId: 'staff-membership', role: 'STAFF', active: true, locationIds: ['castries'] }))
    expect(result).toEqual({ ok: true, membershipId: 'staff-membership' })
    expect(mocks.revalidatePath.mock.calls.map(([path]) => path)).toEqual(refreshedPaths)
  })
})
