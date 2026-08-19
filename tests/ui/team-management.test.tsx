import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PendingInvitationCard } from '@/components/business/PendingInvitationCard'
import { TeamInvitationForm } from '@/components/business/TeamInvitationForm'
import { TeamMemberCard } from '@/components/business/TeamMemberCard'

const locations = [
  { id: 'castries', name: 'Castries' },
  { id: 'soufriere', name: 'Soufrière' },
]
const qualificationOptions = [
  { offeringId: 'facial', offeringName: 'Glow facial', locationId: 'castries', locationName: 'Castries' },
]

describe('team invitation form', () => {
  it('offers Manager, Accounts, and Staff roles to Owners', () => {
    render(<TeamInvitationForm role="OWNER" locations={locations} qualificationOptions={qualificationOptions} action={vi.fn()} />)

    const role = screen.getByRole('combobox', { name: /role/i })
    expect(within(role).getAllByRole('option').map((option) => option.textContent)).toEqual(['Manager', 'Accounts', 'Staff'])
  })

  it('offers Staff only to Managers', () => {
    render(<TeamInvitationForm role="MANAGER" locations={locations} qualificationOptions={qualificationOptions} action={vi.fn()} />)

    const role = screen.getByRole('combobox', { name: /role/i })
    expect(within(role).getAllByRole('option').map((option) => option.textContent)).toEqual(['Staff'])
  })

  it('announces the one-time invitation link and blocks duplicate submission', async () => {
    let resolveAction: ((value: any) => void) | undefined
    const action = vi.fn(() => new Promise<any>((resolve) => { resolveAction = resolve }))
    render(<TeamInvitationForm role="OWNER" locations={locations} qualificationOptions={qualificationOptions} action={action} />)

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Kai Joseph' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'kai@example.com' } })
    const form = screen.getByRole('form', { name: /invite team member/i })
    fireEvent.submit(form)
    fireEvent.submit(form)

    expect(action).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /sending invitation/i })).toBeDisabled()
    resolveAction?.({ ok: true, invitationId: 'invitation-1', invitationUrl: '/invitations/plaintext-token' })
    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('/invitations/plaintext-token')
    expect(within(status).getByRole('button', { name: /copy invitation link/i })).toBeVisible()
  })
})

describe('pending invitation controls', () => {
  const invitation = {
    id: 'invitation-1',
    invitedName: 'Kai Joseph',
    normalizedEmail: 'kai@example.com',
    role: 'STAFF' as const,
    expiresAt: new Date('2026-08-26T12:00:00.000Z'),
    locations: [{ id: 'castries', name: 'Castries' }],
    qualifications: [{ offeringId: 'facial', offeringName: 'Glow facial', locationId: 'castries', locationName: 'Castries' }],
  }

  it('exposes safe copy, resend, and revoke actions without a persisted token prop', () => {
    render(<PendingInvitationCard invitation={invitation} resendAction={vi.fn()} revokeAction={vi.fn()} />)

    expect(screen.getByRole('button', { name: /copy invitation link/i })).toBeVisible()
    expect(screen.getByRole('button', { name: /resend invitation/i })).toBeVisible()
    expect(screen.getByRole('button', { name: /revoke invitation/i })).toBeVisible()
    expect(invitation).not.toHaveProperty('token')
  })

  it('rotates before copying and announces the newly issued one-time link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    const resend = vi.fn().mockResolvedValue({ ok: true, invitationId: 'invitation-1', invitationUrl: '/invitations/rotated-token' })
    render(<PendingInvitationCard invitation={invitation} resendAction={resend} revokeAction={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /copy invitation link/i }))

    await waitFor(() => expect(resend).toHaveBeenCalledTimes(1))
    expect(writeText).toHaveBeenCalledWith('/invitations/rotated-token')
    expect(await screen.findByRole('status')).toHaveTextContent(/new invitation link copied/i)
  })

  it('shows the rotated one-time link when clipboard access fails after a successful resend', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('clipboard denied')) } })
    const resend = vi.fn().mockResolvedValue({ ok: true, invitationId: 'invitation-1', invitationUrl: '/invitations/rotated-token' })
    render(<PendingInvitationCard invitation={invitation} resendAction={resend} revokeAction={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /copy invitation link/i }))

    expect(await screen.findByRole('status')).toHaveTextContent('/invitations/rotated-token')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('member access cards', () => {
  it('lets authorized managers reactivate inactive Staff', () => {
    render(<TeamMemberCard
      actorRole="MANAGER"
      member={{ id: 'staff-membership', name: 'Asha James', email: 'asha@example.com', role: 'STAFF', active: false, locations: [{ id: 'castries', name: 'Castries' }], qualifications: [] }}
      locations={locations}
      qualificationOptions={qualificationOptions}
      action={vi.fn()}
    />)

    expect(screen.getByText('Inactive')).toBeVisible()
    expect(screen.getByRole('button', { name: /reactivate asha james/i })).toBeVisible()
  })

  it('submits the member\'s persisted role, not an unsaved edit-access selection, when toggling active status', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const action = vi.fn().mockResolvedValue({ ok: true, membershipId: 'staff-membership' })
    render(<TeamMemberCard
      actorRole="OWNER"
      member={{ id: 'staff-membership', name: 'Asha James', email: 'asha@example.com', role: 'STAFF', active: true, locations: [{ id: 'castries', name: 'Castries' }], qualifications: [] }}
      locations={locations}
      qualificationOptions={qualificationOptions}
      action={action}
    />)

    fireEvent.change(screen.getByLabelText(/role/i), { target: { value: 'MANAGER' } })
    fireEvent.click(screen.getByRole('button', { name: /deactivate asha james/i }))

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    const submitted = action.mock.calls[0][0] as FormData
    expect(submitted.get('role')).toBe('STAFF')
    expect(submitted.get('active')).toBe('false')
  })
})
