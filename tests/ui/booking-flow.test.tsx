import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  customer: { name: 'Ari Customer', email: 'ari@example.com', phone: '+1 758 555 0100' },
}
const availableDateResponse = { ok: true, json: async () => ({ dates: ['2026-08-20'] }) }
const chooseAvailableDate = async () => {
  const control = screen.getByLabelText('Date')
  await waitFor(() => expect(control).toBeEnabled())
  fireEvent.change(control, { target: { value: '2026-08-20' } })
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

    expect(screen.getByRole('link', { name: /sign in to save this booking/i })).toHaveAttribute(
      'href',
      '/auth/sign-in?callbackUrl=%2Fbook%2Fcalm-studio%3Fhold%3Dhold-1',
    )
  })

  it('restores an authenticated held checkout at prefilled customer details', () => {
    render(<BookingFlow initialState={{ ...state, authenticated: true, customer: { name: 'Ari Customer', email: 'ari@example.com' }, hold: { token: 'hold-1', expiresAt: '2026-08-20T13:10:00.000Z', expired: false } }} />)

    expect(screen.getByRole('heading', { name: /customer details/i })).toBeVisible()
    expect(screen.getByRole('button', { name: /continue to payment/i })).toBeDisabled()
  })

  it('lets a guest enter contact details and complete checkout without signing in', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ order: { id: 'order-guest' }, guestAccessToken: 'private-guest-token' }) })
    vi.stubGlobal('fetch', fetch)
    render(<BookingFlow initialState={{ ...state, authenticated: false, customer: undefined, hold: { token: 'hold-1', expiresAt: '2026-08-20T13:10:00.000Z', expired: false } }} />)

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Guest Customer' } })
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'guest@example.com' } })
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '+1 758 555 0101' } })
    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }))
    fireEvent.click(screen.getByRole('radio', { name: /pay cash/i }))
    fireEvent.click(screen.getByRole('button', { name: /review booking/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }))

    expect(await screen.findByRole('link', { name: /view your booking/i })).toHaveAttribute('href', '/guest/bookings/private-guest-token')
    const request = JSON.parse(String(fetch.mock.calls[0]![1]?.body))
    expect(request).toMatchObject({ customerName: 'Guest Customer', customerEmail: 'guest@example.com', customerPhone: '+1 758 555 0101' })
    vi.unstubAllGlobals()
  })

  it('requires configured intake answers and sensitive consent before payment', () => {
    render(<BookingFlow initialState={{
      ...state, authenticated: false, customer: undefined,
      offerings: [{ ...state.offerings[0], intakeQuestions: [{ id: 'allergies', label: 'List allergies', type: 'SHORT_TEXT', options: null, required: true, sensitive: true }] }],
      hold: { token: 'hold-1', expiresAt: '2026-08-20T13:10:00.000Z', expired: false },
    }} />)
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Guest Customer' } })
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'guest@example.com' } })
    fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '+1 758 555 0101' } })
    const continueButton = screen.getByRole('button', { name: /continue to payment/i })
    expect(continueButton).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/list allergies/i), { target: { value: 'Latex' } })
    expect(continueButton).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: /i consent/i }))
    expect(continueButton).toBeEnabled()
  })

  it('shows held appointment details in Saint Lucia on review and completion', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ order: { id: 'order-1' } }) })
    vi.stubGlobal('fetch', fetch)
    render(<BookingFlow initialState={{
      ...state,
      hold: {
        token: 'hold-1',
        expiresAt: '2026-08-20T13:10:00.000Z',
        expired: false,
        segments: [{
          offeringId: 'service-1',
          offeringName: 'Massage',
          startsAt: '2026-08-20T14:00:00.000Z',
          endsAt: '2026-08-20T15:00:00.000Z',
          locationName: 'Castries',
          professionalName: 'Amara',
        }],
      },
    }} />)

    fireEvent.click(screen.getByRole('radio', { name: /pay cash/i }))
    fireEvent.click(screen.getByRole('button', { name: /review booking/i }))
    expect(screen.getByText(/thursday, 20 august 2026/i)).toBeVisible()
    expect(screen.getByText(/10:00 am/i)).toBeVisible()
    expect(screen.getByText(/castries/i)).toBeVisible()
    expect(screen.getByText(/with amara/i)).toBeVisible()
    expect(screen.getAllByText('Massage').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }))
    await screen.findByRole('status')
    expect(screen.getByText(/thursday, 20 august 2026/i)).toBeVisible()
    expect(screen.getByText(/10:00 am/i)).toBeVisible()
    vi.unstubAllGlobals()
  })

  it('keeps server-rendered payment controls disabled until checkout hydrates', () => {
    const html = renderToString(<BookingFlow initialState={{ ...state, hold: { token: 'hold-1', expiresAt: '2026-08-20T13:10:00.000Z', expired: false } }} />)

    expect(html).toMatch(/name="paymentChoice"[^>]*disabled=""/)
  })

  it('creates a hold after selecting live availability', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(availableDateResponse)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ slots: [{ start: '2026-08-20T14:00:00.000Z', segments: [{ offeringId: 'service-1', membershipId: 'member-1', start: '2026-08-20T14:00:00.000Z', end: '2026-08-20T15:00:00.000Z', occupiedStart: '2026-08-20T14:00:00.000Z', occupiedEnd: '2026-08-20T15:00:00.000Z', attendeeCount: 1 }] }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'hold-1', expiresAt: '2026-08-20T13:10:00.000Z' }) })
    vi.stubGlobal('fetch', fetch)
    render(<BookingFlow initialState={{ ...state, businessId: 'business-1' }} />)
    fireEvent.click(screen.getByRole('button', { name: /continue to location/i }))
    fireEvent.click(screen.getByRole('radio', { name: /castries/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue to date/i }))
    await chooseAvailableDate()
    fireEvent.click(await screen.findByRole('button', { name: /10:00 am/i }))
    expect(await screen.findByText('Time reserved for 10 minutes.')).toBeVisible()
    const availabilityUrl = new URL(String(fetch.mock.calls[0]![0]), 'https://booktrix.test')
    expect(new URL(String(fetch.mock.calls[0]![0]), 'https://booktrx.test').pathname).toBe('/api/availability/dates')
    const exactAvailabilityUrl = new URL(String(fetch.mock.calls[1]![0]), 'https://booktrx.test')
    expect(exactAvailabilityUrl.searchParams.get('from')).toBe('2026-08-20T04:00:00.000Z')
    expect(exactAvailabilityUrl.searchParams.get('to')).toBe('2026-08-21T04:00:00.000Z')
    vi.unstubAllGlobals()
  })

  it('keeps a reservation single-flight while a slot request is pending', async () => {
    let finishReservation: ((value: { ok: boolean; json: () => Promise<{ token: string; expiresAt: string }> }) => void) | undefined
    const fetch = vi.fn()
      .mockResolvedValueOnce(availableDateResponse)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ slots: [{ start: '2026-08-20T14:00:00.000Z', segments: [{ offeringId: 'service-1', membershipId: 'member-1', start: '2026-08-20T14:00:00.000Z', attendeeCount: 1 }] }] }) })
      .mockImplementationOnce(() => new Promise((resolve) => { finishReservation = resolve }))
    vi.stubGlobal('fetch', fetch)
    render(<BookingFlow initialState={{ ...state, businessId: 'business-1' }} />)
    fireEvent.click(screen.getByRole('button', { name: /continue to location/i }))
    fireEvent.click(screen.getByRole('radio', { name: /castries/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue to date/i }))
    await chooseAvailableDate()
    const slot = await screen.findByRole('button', { name: /10:00 am/i })

    fireEvent.click(slot)
    fireEvent.click(slot)

    expect(fetch).toHaveBeenCalledTimes(3)
    expect(screen.getByRole('status')).toHaveTextContent('Reserving your time…')
    expect(slot).toBeDisabled()

    finishReservation?.({ ok: true, json: async () => ({ token: 'hold-1', expiresAt: '2026-08-20T13:10:00.000Z' }) })
    expect(await screen.findByText('Time reserved for 10 minutes.')).toBeVisible()
    vi.unstubAllGlobals()
  })

  it('announces and focuses a failed hold with recovery guidance', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(availableDateResponse)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ slots: [{ start: '2026-08-20T14:00:00.000Z', segments: [{ offeringId: 'service-1', membershipId: 'member-1', start: '2026-08-20T14:00:00.000Z', attendeeCount: 1 }] }] }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ code: 'SLOT_UNAVAILABLE', message: 'That time is no longer available. Please choose another.' }) })
    vi.stubGlobal('fetch', fetch)
    render(<BookingFlow initialState={{ ...state, businessId: 'business-1' }} />)
    fireEvent.click(screen.getByRole('button', { name: /continue to location/i }))
    fireEvent.click(screen.getByRole('radio', { name: /castries/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue to date/i }))
    await chooseAvailableDate()
    fireEvent.click(await screen.findByRole('button', { name: /10:00 am/i }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('That time is no longer available. Please choose another.')
    expect(alert).toHaveFocus()
    vi.unstubAllGlobals()
  })

  it('announces and focuses availability fetch failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(availableDateResponse).mockRejectedValueOnce(new Error('network down')))
    render(<BookingFlow initialState={{ ...state, businessId: 'business-1' }} />)
    fireEvent.click(screen.getByRole('button', { name: /continue to location/i }))
    fireEvent.click(screen.getByRole('radio', { name: /castries/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue to date/i }))
    await chooseAvailableDate()
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Availability could not be loaded. Please try again.')
    expect(alert).toHaveFocus()
    vi.unstubAllGlobals()
  })

  it('announces and focuses malformed hold responses', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(availableDateResponse)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ slots: [{ start: '2026-08-20T14:00:00.000Z', segments: [{ offeringId: 'service-1', membershipId: 'member-1', start: '2026-08-20T14:00:00.000Z', attendeeCount: 1 }] }] }) })
      .mockResolvedValueOnce({ ok: false, json: async () => { throw new Error('invalid json') } })
    vi.stubGlobal('fetch', fetch)
    render(<BookingFlow initialState={{ ...state, businessId: 'business-1' }} />)
    fireEvent.click(screen.getByRole('button', { name: /continue to location/i }))
    fireEvent.click(screen.getByRole('radio', { name: /castries/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue to date/i }))
    await chooseAvailableDate()
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
