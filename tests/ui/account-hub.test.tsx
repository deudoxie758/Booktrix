import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }))
vi.mock('next-auth/react', () => ({ signOut }))

import { AccountHub } from '@/app/profile/AccountHub'

const baseHub = {
  identity: { name: 'Morgan', email: 'morgan@example.test', initial: 'M', points: 0 },
  customer: { stats: { total: 0, completed: 0, upcoming: 0, spentCents: 0 }, nextAppointment: null, recentOrders: [] },
  workspaces: [],
  platformWorkspace: null,
}

describe('AccountHub', () => {
  beforeEach(() => signOut.mockReset())

  it('presents the customer account as the main account landing page', () => {
    render(<AccountHub hub={baseHub} />)

    expect(screen.getByRole('heading', { name: /your booktrix account/i })).toBeVisible()
    expect(screen.getByRole('link', { name: /view all bookings/i })).toHaveAttribute('href', '/profile/bookings')
    expect(screen.getByRole('link', { name: /discover services/i })).toHaveAttribute('href', '/search')
  })

  it('offers sign out from the account hub', async () => {
    signOut.mockResolvedValue(undefined)
    render(<AccountHub hub={baseHub} />)

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }))
    await waitFor(() => expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/' }))
  })

  it('shows each role workspace with honest role-specific shortcuts', () => {
    render(<AccountHub hub={{
      ...baseHub,
      workspaces: [
        { businessId: 'one', businessName: 'Island Glow', businessStatus: 'PUBLISHED', membershipId: 'owner', role: 'OWNER', label: 'Owner', primaryHref: '/business/calendar', todayAppointments: 3, pendingApprovals: 1, activeTeamCount: 5, assignedToday: 0, assignedUpcoming: 0, recordedPaidCents: 0, dueAtAppointmentCents: 0 },
        { businessId: 'two', businessName: 'Harbour Wellness', businessStatus: 'PUBLISHED', membershipId: 'staff', role: 'STAFF', label: 'Staff', primaryHref: '/business/schedule', todayAppointments: 0, pendingApprovals: 0, activeTeamCount: 0, assignedToday: 2, assignedUpcoming: 4, recordedPaidCents: 0, dueAtAppointmentCents: 0 },
        { businessId: 'three', businessName: 'Soufriere Spa', businessStatus: 'PUBLISHED', membershipId: 'accounts', role: 'ACCOUNTS', label: 'Accounts', primaryHref: '/business/finance', todayAppointments: 0, pendingApprovals: 0, activeTeamCount: 0, assignedToday: 0, assignedUpcoming: 0, recordedPaidCents: 10000, dueAtAppointmentCents: 5000 },
      ],
    }} />)

    expect(screen.getByRole('heading', { name: /your workspaces/i })).toBeVisible()
    expect(screen.getByRole('link', { name: /open island glow calendar/i })).toHaveAttribute('href', '/business/select?businessId=one')
    expect(screen.getByRole('link', { name: /open harbour wellness schedule/i })).toHaveAttribute('href', '/business/select?businessId=two')
    expect(screen.getByText(/recorded payments/i)).toBeVisible()
    expect(screen.getByText(/online payment processing is not enabled yet/i)).toBeVisible()
  })

  it('offers administrators a platform workspace', () => {
    render(<AccountHub hub={{ ...baseHub, platformWorkspace: { businesses: 6, applicationsAwaitingReview: 2, href: '/admin' } }} />)

    const adminLink = screen.getByRole('link', { name: /open admin workspace/i })
    expect(adminLink).toHaveAttribute('href', '/admin')
    expect(adminLink.closest('article')).toHaveTextContent('2 awaiting review')
  })
})
