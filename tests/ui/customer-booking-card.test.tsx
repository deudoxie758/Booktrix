import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BookingStatus } from '@/components/booking/BookingStatus'
import { CustomerBookingCard } from '@/components/booking/CustomerBookingCard'

const confirmedSegment = { status: 'CONFIRMED' as const }
const requestedSegment = { status: 'REQUESTED' as const }

describe('customer booking presentation', () => {
  it('labels a mixed order as partially awaiting approval', () => {
    render(<BookingStatus segments={[confirmedSegment, requestedSegment]} />)

    expect(screen.getByText(/partially awaiting approval/i)).toBeVisible()
  })

  it('shows customer-visible appointment details', () => {
    render(<CustomerBookingCard order={{
      id: 'order-1',
      status: 'CONFIRMED',
      subtotalCents: 15000,
      dueOnlineCents: 5000,
      dueAtAppointmentCents: 10000,
      business: { name: 'Cocoa House' },
      Segments: [{
        id: 'segment-1',
        status: 'CONFIRMED',
        startsAt: new Date('2026-08-20T14:00:00.000Z'),
        offering: { name: 'Deep tissue massage' },
        location: { name: 'Rodney Bay' },
        membership: { user: { name: 'Amara' } },
      }],
    }} />)

    expect(screen.getByText('Cocoa House')).toBeVisible()
    expect(screen.getByText(/deep tissue massage/i)).toBeVisible()
    expect(screen.getByText(/rodney bay/i)).toBeVisible()
    expect(screen.getByText(/EC\$150\.00/)).toBeVisible()
    expect(screen.queryByText(/manager note/i)).not.toBeInTheDocument()
  })
})
