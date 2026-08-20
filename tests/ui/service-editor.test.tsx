import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ServiceEditor } from '@/components/business/ServiceEditor'
import { StaffScheduleEditor } from '@/components/business/StaffScheduleEditor'
import { TimeOffEditor } from '@/components/business/TimeOffEditor'

describe('ServiceEditor', () => {
  it('shows service, capacity, confirmation, payment, and location controls', () => {
    render(<ServiceEditor locations={[{ id: 'location-1', name: 'Castries' }]} />)
    expect(screen.getByLabelText(/service name/i)).toBeRequired()
    expect(screen.getByLabelText(/capacity/i)).toHaveAttribute('min', '1')
    expect(screen.getByLabelText(/confirmation/i)).toBeVisible()
    expect(screen.getByRole('checkbox', { name: /castries/i })).toBeVisible()
  })
})

describe('schedule editors', () => {
  it('collects a weekly start and end interval for a professional', () => {
    render(<StaffScheduleEditor locations={[{ id: 'location-1', name: 'Castries' }]} staff={[{ id: 'member-1', name: 'Amara' }]} />)
    expect(screen.getByLabelText(/professional/i)).toBeRequired()
    expect(screen.getByLabelText(/^start time$/i)).toBeRequired()
    expect(screen.getByLabelText(/^end time$/i)).toBeRequired()
    expect(screen.getByRole('button', { name: /save weekly hours/i })).toBeVisible()
  })

  it('collects dated time off and an optional reason', () => {
    render(<TimeOffEditor locations={[{ id: 'location-1', name: 'Castries' }]} staff={[{ id: 'member-1', name: 'Amara' }]} />)
    expect(screen.getByLabelText(/time off starts/i)).toBeRequired()
    expect(screen.getByLabelText(/time off ends/i)).toBeRequired()
    expect(screen.getByLabelText(/reason/i)).toBeVisible()
  })
})
