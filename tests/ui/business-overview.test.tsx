import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WorkspaceOverview } from '@/components/business/WorkspaceOverview'

describe('WorkspaceOverview', () => {
  it('renders role-specific finance cards and a truthful cash collection status', () => {
    render(<WorkspaceOverview overview={{
      role: 'ACCOUNTS', business: { id: 'business-1', name: 'Island Glow', status: 'PUBLISHED' }, locations: [{ id: 'location-1', name: 'Castries', timezone: 'America/St_Lucia' }], locationIds: ['location-1'], alerts: [],
      bookedRevenueCents: 12000, cashCollectedCents: 0, cashDueAtAppointmentCents: 9000, pendingOnlinePaymentCents: 3000, pendingOnlinePaymentRequests: 1, recentTransactions: [{ id: 'order-1', amountCents: 12000, cashDueCents: 9000, pendingOnlineCents: 3000 }],
    }} />)

    expect(screen.getByRole('heading', { name: /finance overview/i })).toBeVisible()
    expect(screen.getByText('EC$120.00')).toBeVisible()
    expect(screen.getByText(/cash collection will be available in the finance workspace/i)).toBeVisible()
    expect(screen.getByRole('heading', { name: /recent finance activity/i })).toBeVisible()
    expect(screen.getByText(/booking order-1/i)).toBeVisible()
    expect(screen.getByRole('link', { name: /open finance ledger/i })).toHaveAttribute('href', '/business/finance')
  })

  it('renders owner alerts and operational quick links', () => {
    render(<WorkspaceOverview overview={{
      role: 'OWNER', business: { id: 'business-1', name: 'Island Glow', status: 'PUBLISHED' }, locations: [{ id: 'location-1', name: 'Castries', timezone: 'America/St_Lucia' }], locationIds: ['location-1'],
      alerts: [{ kind: 'MISSING_HOURS', message: 'Castries is missing opening hours.' }], todayAppointments: 2, pendingApprovals: 1, staffScheduledToday: 1, locationUtilization: [], agenda: [{ id: 'segment-1', startsAt: new Date('2026-08-19T15:00:00Z'), endsAt: new Date('2026-08-19T16:00:00Z'), status: 'CONFIRMED', offeringName: 'Glow facial', customerName: 'Kai Joseph', locationName: 'Castries' }],
    }} />)

    expect(screen.getByRole('heading', { name: /operations overview/i })).toBeVisible()
    expect(screen.getByText(/missing opening hours/i)).toBeVisible()
    expect(screen.getByRole('heading', { name: /today.?s agenda/i })).toBeVisible()
    expect(screen.getByText(/kai joseph/i)).toBeVisible()
    expect(screen.getByRole('link', { name: /open calendar/i })).toHaveAttribute('href', '/business/calendar')
    expect(screen.getByRole('link', { name: /manage team/i })).toHaveAttribute('href', '/business/team')
  })

  it('shows staff the locations where their assigned work is scoped', () => {
    render(<WorkspaceOverview overview={{
      role: 'STAFF', business: { id: 'business-1', name: 'Island Glow', status: 'PUBLISHED' }, locations: [{ id: 'location-1', name: 'Castries', timezone: 'America/St_Lucia' }], locationIds: ['location-1'], alerts: [], nextAppointment: null, todaySchedule: [], upcomingTimeOff: [],
    }} />)

    expect(screen.getByText(/assigned locations/i)).toBeVisible()
    expect(screen.getByText('Castries')).toBeVisible()
  })
})
