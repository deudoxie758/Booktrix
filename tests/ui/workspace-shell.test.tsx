import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }))

vi.mock('next-auth/react', () => ({ signOut }))
const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn(() => '/business/calendar') }))
vi.mock('next/navigation', () => ({ usePathname }))

import { WorkspaceShell } from '@/components/shells/WorkspaceShell'

describe('WorkspaceShell', () => {
  it('keeps the logo in the business workspace and exposes account, marketplace, and sign out', () => {
    render(<WorkspaceShell title="Island Glow" role="OWNER"><div>Body</div></WorkspaceShell>)

    expect(screen.getByRole('link', { name: /booktrix/i })).toHaveAttribute('href', '/business')
    expect(screen.getByRole('link', { name: /view marketplace/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /my account/i })).toHaveAttribute('href', '/profile')
    expect(screen.getByRole('button', { name: /sign out/i })).toBeVisible()
  })

  it('marks the current desktop destination and exposes the same links from mobile navigation', () => {
    render(<WorkspaceShell title="Island Glow" role="OWNER"><div>Body</div></WorkspaceShell>)

    expect(screen.getByRole('link', { name: 'Calendar' })).toHaveAttribute('aria-current', 'page')
    fireEvent.click(screen.getByRole('button', { name: /open workspace navigation/i }))
    expect(screen.getAllByRole('link', { name: 'Calendar' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: /view marketplace/i })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: /my account/i })).toHaveLength(2)
  })

  it('marks nested business destinations as current without marking the overview for every page', () => {
    usePathname.mockReturnValue('/business/calendar/appointment-1')
    render(<WorkspaceShell title="Island Glow" role="OWNER"><div>Body</div></WorkspaceShell>)

    expect(screen.getByRole('link', { name: 'Calendar' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current')
  })
})
