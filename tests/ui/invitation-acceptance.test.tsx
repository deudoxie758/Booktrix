import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getActor: vi.fn() }))
vi.mock('@/modules/identity/session', () => ({ getActor: mocks.getActor }))

import InvitationPage from '@/app/invitations/[token]/page'

describe('invitation acceptance page', () => {
  beforeEach(() => mocks.getActor.mockResolvedValue(null))

  it('offers safe sign-in and sign-up callbacks when no account session exists', async () => {
    render(await InvitationPage({ params: { token: 'one-time-token' }, searchParams: {} }))

    expect(screen.getByRole('link', { name: /sign in to accept/i })).toHaveAttribute('href', '/auth/sign-in?callbackUrl=%2Finvitations%2Fone-time-token')
    expect(screen.getByRole('link', { name: /create an account/i })).toHaveAttribute('href', '/auth/signup?callbackUrl=%2Finvitations%2Fone-time-token')
  })

  it('posts authenticated acceptance through the dedicated endpoint', async () => {
    mocks.getActor.mockResolvedValue({ id: 'invitee', email: 'invitee@example.com', name: 'Kai', platformRole: 'USER' })

    render(await InvitationPage({ params: { token: 'one-time-token' }, searchParams: {} }))

    const form = screen.getByRole('form', { name: /accept team invitation/i })
    expect(form).toHaveAttribute('action', '/api/team-invitations/accept')
    expect(screen.getByDisplayValue('one-time-token')).toHaveAttribute('name', 'token')
    expect(screen.getByRole('button', { name: /accept invitation/i })).toBeVisible()
  })
})
