import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BookingAgenda } from '@/components/business/BookingAgenda'
import { BookingEditor } from '@/components/business/BookingEditor'

describe('BookingAgenda', () => {
  it('shows the customer, service, time, and status in the mobile agenda', () => {
    render(<BookingAgenda segments={[{ id: 'segment-1', startsAt: new Date('2026-08-20T14:00:00Z'), status: 'REQUESTED', order: { customerName: 'Kai Joseph', customer: null }, offering: { name: 'Consultation' }, location: { name: 'Castries' }, membership: null }]} />)
    expect(screen.getByText('Kai Joseph')).toBeVisible()
    expect(screen.getByText('Consultation')).toBeVisible()
    expect(screen.getByText(/awaiting approval/i)).toBeVisible()
  })

  it('offers only valid lifecycle operations', () => {
    render(<BookingAgenda locationId="location-1" action={() => {}} segments={[{ id: 'segment-1', startsAt: new Date('2026-08-20T14:00:00Z'), status: 'REQUESTED', order: { customerName: 'Kai Joseph', customer: null }, offering: { name: 'Consultation' }, location: { name: 'Castries' }, membership: null }]} />)
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
})
