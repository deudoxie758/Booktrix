import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LocationCard } from '@/components/business/LocationCard'
import { LocationEditor } from '@/components/business/LocationEditor'
import { LocationHoursEditor } from '@/components/business/LocationHoursEditor'
import { LocationManagement } from '@/components/business/LocationManagement'
import type { ManagedLocation } from '@/modules/locations/management'

const location: ManagedLocation = {
  id: 'location-1',
  businessId: 'business-1',
  name: 'Castries Studio',
  slug: 'castries',
  address: '1 High Street, Castries',
  phone: '+1 758 555 0100',
  email: 'castries@example.com',
  timezone: 'America/St_Lucia',
  isActive: true,
  hours: [
    { weekday: 1, startMinute: 540, endMinute: 1020 },
    { weekday: 2, startMinute: 540, endMinute: 1020 },
    { weekday: 3, startMinute: 540, endMinute: 1020 },
    { weekday: 4, startMinute: 540, endMinute: 1020 },
    { weekday: 5, startMinute: 540, endMinute: 1080 },
  ],
  serviceCount: 3,
  teamCount: 5,
}

const actions = {
  createLocation: vi.fn().mockResolvedValue({ ok: true as const, locationId: 'created' }),
  updateLocation: vi.fn().mockResolvedValue({ ok: true as const, locationId: 'location-1' }),
  setHours: vi.fn().mockResolvedValue({ ok: true as const, locationId: 'location-1' }),
  setActive: vi.fn().mockResolvedValue({ ok: true as const, locationId: 'location-1' }),
}

describe('location management roles and summaries', () => {
  it('shows editable controls to managers and a read-only view to accounts', () => {
    const { rerender } = render(<LocationManagement role="MANAGER" locations={[location]} actions={actions} />)
    expect(screen.getByRole('button', { name: /add location/i })).toBeVisible()
    expect(screen.getByText('3 services')).toBeVisible()
    expect(screen.getByText('5 team members')).toBeVisible()

    rerender(<LocationManagement role="ACCOUNTS" locations={[location]} actions={actions} />)
    expect(screen.queryByRole('button', { name: /add location/i })).not.toBeInTheDocument()
    expect(screen.getByText(/read-only access/i)).toBeVisible()
    expect(screen.queryByRole('button', { name: /deactivate/i })).not.toBeInTheDocument()
  })

  it('labels identity fields and exposes one explicit row for every weekday', () => {
    render(<LocationManagement role="OWNER" locations={[location]} actions={actions} />)

    const addForm = screen.getByRole('form', { name: /add location/i })
    expect(within(addForm).getByLabelText(/location name/i)).toBeRequired()
    expect(within(addForm).getByLabelText(/^slug/i)).toBeRequired()
    expect(within(addForm).getByLabelText(/^address/i)).toBeRequired()
    expect(within(addForm).getByLabelText(/^phone/i)).toBeVisible()
    expect(within(addForm).getByLabelText(/^email/i)).toBeVisible()

    for (const day of ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']) {
      expect(screen.getByRole('group', { name: day })).toBeVisible()
    }
  })
})

describe('location form feedback', () => {
  it('announces field errors semantically and keeps entered values', async () => {
    const action = vi.fn().mockResolvedValue({
      ok: false as const,
      error: 'Please correct the highlighted fields.',
      fieldErrors: { slug: 'This slug is already used by another location.' },
    })
    render(<LocationEditor mode="create" action={action} />)

    fireEvent.change(screen.getByLabelText(/location name/i), { target: { value: 'Rodney Bay' } })
    fireEvent.change(screen.getByLabelText(/^slug/i), { target: { value: 'rodney-bay' } })
    fireEvent.change(screen.getByLabelText(/^address/i), { target: { value: 'Baywalk Mall' } })
    fireEvent.submit(screen.getByRole('form', { name: /add location/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Please correct the highlighted fields.')
    expect(screen.getByText('This slug is already used by another location.')).toBeVisible()
    expect(screen.getByLabelText(/location name/i)).toHaveValue('Rodney Bay')
  })

  it('announces success and blocks duplicate submission while pending', async () => {
    let resolveAction: ((value: { ok: true; locationId: string }) => void) | undefined
    const action = vi.fn(() => new Promise<{ ok: true; locationId: string }>((resolve) => { resolveAction = resolve }))
    render(<LocationEditor mode="create" action={action} />)

    fireEvent.change(screen.getByLabelText(/location name/i), { target: { value: 'Rodney Bay' } })
    fireEvent.change(screen.getByLabelText(/^slug/i), { target: { value: 'rodney-bay' } })
    fireEvent.change(screen.getByLabelText(/^address/i), { target: { value: 'Baywalk Mall' } })
    const form = screen.getByRole('form', { name: /add location/i })
    fireEvent.submit(form)
    fireEvent.submit(form)

    expect(action).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /saving location/i })).toBeDisabled()
    resolveAction?.({ ok: true, locationId: 'created' })
    expect(await screen.findByRole('status')).toHaveTextContent('Location added successfully.')
  })

  it('announces weekly-hours success', async () => {
    const action = vi.fn().mockResolvedValue({ ok: true as const, locationId: 'location-1' })
    render(<LocationHoursEditor location={location} action={action} />)

    fireEvent.submit(screen.getByRole('form', { name: /weekly hours/i }))

    expect(await screen.findByRole('status')).toHaveTextContent('Opening hours saved.')
  })
})

describe('location deactivation confirmation', () => {
  it('requires confirmation before deactivating and reports success', async () => {
    const action = vi.fn().mockResolvedValue({ ok: true as const, locationId: 'location-1' })
    const confirmation = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    render(<LocationCard role="MANAGER" location={location} updateAction={actions.updateLocation} hoursAction={actions.setHours} activeAction={action} />)

    fireEvent.click(screen.getByRole('button', { name: /deactivate/i }))
    expect(action).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /deactivate/i }))
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    expect(action.mock.calls[0][0].get('locationId')).toBe('location-1')
    expect(action.mock.calls[0][0].get('active')).toBe('false')
    expect(await screen.findByRole('status')).toHaveTextContent('Location deactivated.')
    expect(screen.getByText('Inactive')).toBeVisible()
    expect(screen.getByRole('button', { name: /activate location/i })).toBeVisible()
    confirmation.mockRestore()
  })
})
