import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BookingFlow } from '@/app/book/[businessSlug]/BookingFlow'

const state = {
  businessSlug: 'calm-studio',
  businessName: 'Calm Studio',
  locations: [{ id: 'location-1', name: 'Castries' }],
  offerings: [{ id: 'service-1', name: 'Massage', durationMinutes: 60, priceCents: 12000, currency: 'XCD', paymentChoices: ['FULL', 'CASH'] as const }],
  selectedOfferingIds: ['service-1'],
  hold: null,
}

describe('BookingFlow', () => {
  it('shows the six checkout steps and persistent service summary', () => {
    render(<BookingFlow initialState={state} />)
    expect(screen.getByRole('navigation', { name: /booking progress/i })).toHaveTextContent('ServicesLocation & professionalDate & timeCustomer detailsPaymentReview')
    expect(screen.getByText('Massage')).toBeVisible()
    expect(screen.getAllByText('$120.00 XCD')).toHaveLength(2)
  })

  it('moves focus to an expired-hold recovery alert', () => {
    render(<BookingFlow initialState={{ ...state, hold: { token: 'expired', expiresAt: '2026-08-20T13:00:00.000Z', expired: true } }} />)
    expect(screen.getByRole('alert')).toHaveFocus()
  })

  it('advances after choosing a location', () => {
    render(<BookingFlow initialState={state} />)
    fireEvent.click(screen.getByRole('button', { name: /continue to location/i }))
    fireEvent.click(screen.getByRole('radio', { name: /castries/i }))
    expect(screen.getByRole('button', { name: /continue to date/i })).toBeEnabled()
  })

  it('creates a hold after selecting live availability', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ slots: [{ start: '2026-08-20T14:00:00.000Z', segments: [{ offeringId: 'service-1', membershipId: 'member-1', start: '2026-08-20T14:00:00.000Z', end: '2026-08-20T15:00:00.000Z', occupiedStart: '2026-08-20T14:00:00.000Z', occupiedEnd: '2026-08-20T15:00:00.000Z', attendeeCount: 1 }] }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'hold-1', expiresAt: '2026-08-20T13:10:00.000Z' }) })
    vi.stubGlobal('fetch', fetch)
    render(<BookingFlow initialState={{ ...state, businessId: 'business-1' }} />)
    fireEvent.click(screen.getByRole('button', { name: /continue to location/i }))
    fireEvent.click(screen.getByRole('radio', { name: /castries/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue to date/i }))
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-08-20' } })
    fireEvent.click(await screen.findByRole('button', { name: /10:00 am/i }))
    expect(await screen.findByRole('status')).toHaveTextContent('Time reserved for 10 minutes')
    vi.unstubAllGlobals()
  })

  it('submits the held order from review', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ order: { id: 'order-1' } }) })
    vi.stubGlobal('fetch', fetch)
    render(<BookingFlow initialState={{ ...state, hold: { token: 'hold-1', expiresAt: '2026-08-20T13:10:00.000Z', expired: false } }} />)
    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }))
    fireEvent.click(screen.getByRole('radio', { name: /pay cash/i }))
    fireEvent.click(screen.getByRole('button', { name: /review booking/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }))
    expect(await screen.findByRole('link', { name: /view your booking/i })).toHaveAttribute('href', '/profile/bookings/order-1')
    expect(fetch).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })
})
