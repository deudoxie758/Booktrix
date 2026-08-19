import { fireEvent, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { BookingFlow } from '@/app/book/[businessSlug]/BookingFlow'

const state = {
  businessSlug: 'calm-studio',
  businessName: 'Calm Studio',
  locations: [{ id: 'location-1', name: 'Castries' }],
  offerings: [{ id: 'service-1', name: 'Massage', durationMinutes: 60, priceCents: 12000, currency: 'XCD', paymentChoices: ['FULL', 'CASH'] as const }],
  selectedOfferingIds: ['service-1'],
  hold: null,
  authenticated: true,
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

  it('sends an anonymous customer with an active hold through the held-checkout sign-in callback', () => {
    render(<BookingFlow initialState={{ ...state, authenticated: false, hold: { token: 'hold-1', expiresAt: '2026-08-20T13:10:00.000Z', expired: false } }} />)

    expect(screen.getByRole('link', { name: /sign in to continue/i })).toHaveAttribute(
      'href',
      '/auth/sign-in?callbackUrl=%2Fbook%2Fcalm-studio%3Fhold%3Dhold-1',
    )
  })

  it('restores an authenticated held checkout at payment', () => {
    render(<BookingFlow initialState={{ ...state, authenticated: true, hold: { token: 'hold-1', expiresAt: '2026-08-20T13:10:00.000Z', expired: false } }} />)

    expect(screen.getByRole('group', { name: /how would you like to pay/i })).toBeVisible()
    expect(screen.getByRole('radio', { name: /pay cash/i })).toBeVisible()
  })

  it('keeps server-rendered payment controls disabled until checkout hydrates', () => {
    const html = renderToString(<BookingFlow initialState={{ ...state, hold: { token: 'hold-1', expiresAt: '2026-08-20T13:10:00.000Z', expired: false } }} />)

    expect(html).toMatch(/name="paymentChoice"[^>]*disabled=""/)
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
    expect(await screen.findByText('Time reserved for 10 minutes.')).toBeVisible()
    const availabilityUrl = new URL(String(fetch.mock.calls[0]![0]), 'https://booktrix.test')
    expect(availabilityUrl.searchParams.get('from')).toBe('2026-08-20T04:00:00.000Z')
    expect(availabilityUrl.searchParams.get('to')).toBe('2026-08-21T04:00:00.000Z')
    vi.unstubAllGlobals()
  })

  it('keeps a reservation single-flight while a slot request is pending', async () => {
    let finishReservation: ((value: { ok: boolean; json: () => Promise<{ token: string; expiresAt: string }> }) => void) | undefined
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ slots: [{ start: '2026-08-20T14:00:00.000Z', segments: [{ offeringId: 'service-1', membershipId: 'member-1', start: '2026-08-20T14:00:00.000Z', attendeeCount: 1 }] }] }) })
      .mockImplementationOnce(() => new Promise((resolve) => { finishReservation = resolve }))
    vi.stubGlobal('fetch', fetch)
    render(<BookingFlow initialState={{ ...state, businessId: 'business-1' }} />)
    fireEvent.click(screen.getByRole('button', { name: /continue to location/i }))
    fireEvent.click(screen.getByRole('radio', { name: /castries/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue to date/i }))
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-08-20' } })
    const slot = await screen.findByRole('button', { name: /10:00 am/i })

    fireEvent.click(slot)
    fireEvent.click(slot)

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('status')).toHaveTextContent('Reserving your time…')
    expect(slot).toBeDisabled()

    finishReservation?.({ ok: true, json: async () => ({ token: 'hold-1', expiresAt: '2026-08-20T13:10:00.000Z' }) })
    expect(await screen.findByText('Time reserved for 10 minutes.')).toBeVisible()
    vi.unstubAllGlobals()
  })

  it('announces and focuses a failed hold with recovery guidance', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ slots: [{ start: '2026-08-20T14:00:00.000Z', segments: [{ offeringId: 'service-1', membershipId: 'member-1', start: '2026-08-20T14:00:00.000Z', attendeeCount: 1 }] }] }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ code: 'SLOT_UNAVAILABLE', message: 'That time is no longer available. Please choose another.' }) })
    vi.stubGlobal('fetch', fetch)
    render(<BookingFlow initialState={{ ...state, businessId: 'business-1' }} />)
    fireEvent.click(screen.getByRole('button', { name: /continue to location/i }))
    fireEvent.click(screen.getByRole('radio', { name: /castries/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue to date/i }))
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-08-20' } })
    fireEvent.click(await screen.findByRole('button', { name: /10:00 am/i }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('That time is no longer available. Please choose another.')
    expect(alert).toHaveFocus()
    vi.unstubAllGlobals()
  })

  it('announces and focuses availability fetch failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    render(<BookingFlow initialState={{ ...state, businessId: 'business-1' }} />)
    fireEvent.click(screen.getByRole('button', { name: /continue to location/i }))
    fireEvent.click(screen.getByRole('radio', { name: /castries/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue to date/i }))
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-08-20' } })
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Availability could not be loaded. Please try again.')
    expect(alert).toHaveFocus()
    vi.unstubAllGlobals()
  })

  it('announces and focuses malformed hold responses', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ slots: [{ start: '2026-08-20T14:00:00.000Z', segments: [{ offeringId: 'service-1', membershipId: 'member-1', start: '2026-08-20T14:00:00.000Z', attendeeCount: 1 }] }] }) })
      .mockResolvedValueOnce({ ok: false, json: async () => { throw new Error('invalid json') } })
    vi.stubGlobal('fetch', fetch)
    render(<BookingFlow initialState={{ ...state, businessId: 'business-1' }} />)
    fireEvent.click(screen.getByRole('button', { name: /continue to location/i }))
    fireEvent.click(screen.getByRole('radio', { name: /castries/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue to date/i }))
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-08-20' } })
    fireEvent.click(await screen.findByRole('button', { name: /10:00 am/i }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('That time could not be reserved. Please choose another.')
    expect(alert).toHaveFocus()
    vi.unstubAllGlobals()
  })

  it('submits the held order from review', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ order: { id: 'order-1' } }) })
    vi.stubGlobal('fetch', fetch)
    render(<BookingFlow initialState={{ ...state, hold: { token: 'hold-1', expiresAt: '2026-08-20T13:10:00.000Z', expired: false } }} />)
    fireEvent.click(screen.getByRole('radio', { name: /pay cash/i }))
    fireEvent.click(screen.getByRole('button', { name: /review booking/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }))
    const confirmation = await screen.findByRole('status')
    expect(confirmation).toHaveTextContent('Booking complete. You can view your booking details below.')
    expect(confirmation).toHaveFocus()
    expect(screen.queryByText('Your slot is reserved while checkout completes.')).not.toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /view your booking/i })).toHaveAttribute('href', '/profile/bookings/order-1')
    expect(fetch).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })

  it('announces and focuses checkout network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    render(<BookingFlow initialState={{ ...state, hold: { token: 'hold-1', expiresAt: '2026-08-20T13:10:00.000Z', expired: false } }} />)
    fireEvent.click(screen.getByRole('radio', { name: /pay cash/i }))
    fireEvent.click(screen.getByRole('button', { name: /review booking/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Unable to complete this booking. Please try again.')
    expect(alert).toHaveFocus()
    vi.unstubAllGlobals()
  })

  it('reuses the booking idempotency key when confirmation is retried', async () => {
    const fetch = vi.fn()
      .mockRejectedValueOnce(new Error('response lost'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ order: { id: 'order-1' } }) })
    vi.stubGlobal('fetch', fetch)
    render(<BookingFlow initialState={{ ...state, hold: { token: 'hold-1', expiresAt: '2026-08-20T13:10:00.000Z', expired: false } }} />)
    fireEvent.click(screen.getByRole('radio', { name: /pay cash/i }))
    fireEvent.click(screen.getByRole('button', { name: /review booking/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }))
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }))
    await screen.findByRole('link', { name: /view your booking/i })

    const first = JSON.parse(String(fetch.mock.calls[0]![1]?.body))
    const second = JSON.parse(String(fetch.mock.calls[1]![1]?.body))
    expect(second.idempotencyKey).toBe(first.idempotencyKey)
    vi.unstubAllGlobals()
  })
})
