import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BookingAgenda } from '@/components/business/BookingAgenda'
import { BookingEditor } from '@/components/business/BookingEditor'

describe('BookingAgenda', () => {
  it('shows the customer, service, time, and status in the mobile agenda', () => {
    render(<BookingAgenda segments={[{ id: 'segment-1', startsAt: new Date('2026-08-20T14:00:00Z'), status: 'REQUESTED', order: { id: 'order-1', customerName: 'Kai Joseph', customer: null }, offering: { name: 'Consultation' }, location: { name: 'Castries' }, membership: null }]} />)
    expect(screen.getByText('Kai Joseph')).toBeVisible()
    expect(screen.getByText('Consultation')).toBeVisible()
    expect(screen.getByText(/awaiting approval/i)).toBeVisible()
  })

  it('offers only valid lifecycle operations', () => {
    render(<BookingAgenda locationId="location-1" action={() => {}} segments={[{ id: 'segment-1', startsAt: new Date('2026-08-20T14:00:00Z'), status: 'REQUESTED', order: { id: 'order-1', customerName: 'Kai Joseph', customer: null }, offering: { name: 'Consultation' }, location: { name: 'Castries' }, membership: null }]} />)
    expect(screen.getByRole('button', { name: /approve/i })).toBeVisible()
    expect(screen.getByRole('button', { name: /reject/i })).toBeVisible()
    expect(screen.queryByRole('button', { name: /complete/i })).not.toBeInTheDocument()
  })
})

describe('BookingEditor', () => {
  it('collects explicit walk-in contact details', () => {
    render(<BookingEditor locations={[{ id: 'location-1', name: 'Castries' }]} offerings={[{ id: 'service-1', name: 'Consultation' }]} staff={[]} />)
    fireEvent.click(screen.getByRole('radio', { name: /walk-in customer/i }))
    expect(screen.getByLabelText(/customer name/i)).toBeRequired()
    expect(screen.getByLabelText(/phone/i)).toBeVisible()
    expect(screen.getByRole('button', { name: /create booking/i })).toBeVisible()
  })

  it('requires a professional who is qualified for the selected service', () => {
    render(<BookingEditor
      locations={[{ id: 'location-1', name: 'Castries' }]}
      offerings={[{ id: 'service-1', name: 'Consultation' }, { id: 'service-2', name: 'Massage' }]}
      staff={[
        { id: 'member-1', name: 'Kai', offeringIds: ['service-1'] },
        { id: 'member-2', name: 'Amara', offeringIds: ['service-2'] },
      ]}
    />)

    fireEvent.change(screen.getByLabelText('Service'), { target: { value: 'service-1' } })
    const professional = screen.getByLabelText('Professional')
    expect(professional).toBeRequired()
    expect(screen.getByRole('option', { name: 'Kai' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Amara' })).not.toBeInTheDocument()
  })

  it('shows a rejected booking without leaving the form stuck', async () => {
    const action = vi.fn().mockResolvedValue({ ok: false, error: 'That time is no longer available. Choose another time.' })
    render(<BookingEditor
      action={action}
      locations={[{ id: 'location-1', name: 'Castries' }]}
      offerings={[{ id: 'service-1', name: 'Consultation' }]}
      staff={[{ id: 'member-1', name: 'Kai', offeringIds: ['service-1'] }]}
    />)

    fireEvent.click(screen.getByRole('radio', { name: /walk-in customer/i }))
    fireEvent.change(screen.getByLabelText(/customer name/i), { target: { value: 'Maya Joseph' } })
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'location-1' } })
    fireEvent.change(screen.getByLabelText('Service'), { target: { value: 'service-1' } })
    fireEvent.change(screen.getByLabelText('Professional'), { target: { value: 'member-1' } })
    fireEvent.change(screen.getByLabelText(/date and time/i), { target: { value: '2030-01-15T10:00' } })
    fireEvent.click(screen.getByRole('button', { name: /create booking/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no longer available/i)
    await waitFor(() => expect(screen.getByRole('button', { name: /create booking/i })).toBeEnabled())
  })

  it('confirms a successful booking and resets the appointment fields', async () => {
    const action = vi.fn().mockImplementation(async () => {
      await Promise.resolve()
      return { ok: true as const }
    })
    render(<BookingEditor
      action={action}
      locations={[{ id: 'location-1', name: 'Castries' }]}
      offerings={[{ id: 'service-1', name: 'Consultation' }]}
      staff={[{ id: 'member-1', name: 'Kai', offeringIds: ['service-1'] }]}
    />)

    fireEvent.click(screen.getByRole('radio', { name: /walk-in customer/i }))
    fireEvent.change(screen.getByLabelText(/customer name/i), { target: { value: 'Maya Joseph' } })
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'location-1' } })
    fireEvent.change(screen.getByLabelText('Service'), { target: { value: 'service-1' } })
    fireEvent.change(screen.getByLabelText('Professional'), { target: { value: 'member-1' } })
    fireEvent.change(screen.getByLabelText(/date and time/i), { target: { value: '2030-01-15T10:00' } })
    fireEvent.click(screen.getByRole('button', { name: /create booking/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/created successfully/i)
    expect(screen.getByLabelText('Service')).toHaveValue('')
  })
})
