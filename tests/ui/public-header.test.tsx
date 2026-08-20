import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }))
vi.mock('next-auth/react', () => ({ signOut }))

import { PublicHeader } from '@/components/shells/PublicHeader'

describe('PublicHeader', () => {
  beforeEach(() => signOut.mockReset())

  it('always sends a signed-in person to their account hub', () => {
    render(<PublicHeader signedIn />)
    expect(screen.getByRole('link', { name: /my account/i })).toHaveAttribute('href', '/profile')
  })

  it('lets a signed-in person sign out and switch accounts', async () => {
    signOut.mockResolvedValue(undefined)
    render(<PublicHeader signedIn />)

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }))

    await waitFor(() => expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/' }))
  })
})
