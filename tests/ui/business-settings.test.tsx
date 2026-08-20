import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BookingPolicyForm } from '@/components/business/BookingPolicyForm'
import { BusinessProfileForm } from '@/components/business/BusinessProfileForm'
import { PublicationSettings } from '@/components/business/PublicationSettings'
import { getIntegrationStagingStatus } from '@/modules/settings/business-policy'

const profile = { name: 'Island Glow', slug: 'island-glow', description: 'A calm neighborhood spa.', phone: '+1 758 555 0100', email: 'hello@islandglow.example' }
const policy = {
  currency: 'XCD', timezone: 'America/St_Lucia', defaultConfirmationMode: 'AUTOMATIC' as const,
  minimumNoticeMinutes: 60, maximumAdvanceBookingDays: 90, defaultPreparationMinutes: 10, defaultCleanupMinutes: 10,
  cancellationNoticeHours: 24, reschedulingNoticeHours: 24, cancellationPolicyText: 'Cancel 24 hours ahead for a full refund.',
}

describe('BusinessProfileForm', () => {
  it('renders the Booktrix design system and labelled identity fields in a dedicated profile section', () => {
    const action = vi.fn()
    render(<BusinessProfileForm profile={profile} action={action} />)

    const section = document.getElementById('profile')
    expect(section).not.toBeNull()
    expect(section?.className).toMatch(/border-sand-200/)
    const form = screen.getByRole('form', { name: /business profile/i })
    expect(within(form).getByLabelText(/business name/i)).toHaveValue('Island Glow')
    expect(within(form).getByLabelText(/^slug/i)).toHaveValue('island-glow')
    expect(within(form).getByLabelText(/description/i)).toHaveValue('A calm neighborhood spa.')
  })

  it('announces field errors semantically and keeps entered values', async () => {
    const action = vi.fn().mockResolvedValue({ ok: false, error: 'Please correct the highlighted fields.', fieldErrors: { slug: 'This slug is already used by another business.' } })
    render(<BusinessProfileForm profile={profile} action={action} />)

    fireEvent.change(screen.getByLabelText(/business name/i), { target: { value: 'Renamed Spa' } })
    fireEvent.submit(screen.getByRole('form', { name: /business profile/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Please correct the highlighted fields.')
    expect(screen.getByText('This slug is already used by another business.')).toBeVisible()
    expect(screen.getByLabelText(/business name/i)).toHaveValue('Renamed Spa')
  })

  it('announces a semantic success status', async () => {
    const action = vi.fn().mockResolvedValue({ ok: true, profile })
    render(<BusinessProfileForm profile={profile} action={action} />)
    fireEvent.submit(screen.getByRole('form', { name: /business profile/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/saved/i)
  })
})

describe('BookingPolicyForm', () => {
  it('shows explicit, locked XCD currency and Saint Lucia timezone fields in a dedicated policy section', () => {
    const action = vi.fn()
    render(<BookingPolicyForm policy={policy} action={action} />)

    expect(document.getElementById('policy')).not.toBeNull()
    const currencyField = screen.getByLabelText(/currency/i)
    const timezoneField = screen.getByLabelText(/timezone/i)
    expect(currencyField).toHaveValue('XCD')
    expect(currencyField).toHaveAttribute('readonly')
    expect(timezoneField).toHaveValue('America/St_Lucia')
    expect(timezoneField).toHaveAttribute('readonly')
  })

  it('exposes notice, buffer, and cancellation policy fields, and never rewrites existing services when saved', async () => {
    const action = vi.fn().mockResolvedValue({ ok: true, policy })
    render(<BookingPolicyForm policy={policy} action={action} />)

    expect(screen.getByLabelText(/minimum booking notice/i)).toHaveValue(60)
    expect(screen.getByLabelText(/maximum advance booking/i)).toHaveValue(90)
    expect(screen.getByLabelText(/cancellation and rescheduling policy/i)).toHaveValue(policy.cancellationPolicyText)

    fireEvent.submit(screen.getByRole('form', { name: /booking policy/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/saved/i)
    expect(screen.getByText(/never rewrites confirmation mode, buffers, or cancellation lead time/i)).toBeVisible()
  })

  it('announces field errors semantically', async () => {
    const action = vi.fn().mockResolvedValue({ ok: false, error: 'Please correct the highlighted fields.', fieldErrors: { minimumNoticeMinutes: 'Minimum notice cannot be negative.' } })
    render(<BookingPolicyForm policy={policy} action={action} />)
    fireEvent.submit(screen.getByRole('form', { name: /booking policy/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Please correct the highlighted fields.')
    expect(screen.getByText('Minimum notice cannot be negative.')).toBeVisible()
  })
})

describe('PublicationSettings', () => {
  it('links each publication blocker to where an Owner can resolve it', () => {
    const readiness = { status: 'SETUP', ready: false, blockers: [
      { code: 'NO_ACTIVE_LOCATION', message: 'Add an active location', href: '/business/locations' },
      { code: 'MISSING_CANCELLATION_POLICY', message: 'Add your cancellation and rescheduling policy text', href: '#policy' },
    ] }
    render(<PublicationSettings readiness={readiness} integrationStatus={getIntegrationStagingStatus()} action={vi.fn()} />)

    expect(screen.getByRole('link', { name: /add an active location/i })).toHaveAttribute('href', '/business/locations')
    expect(screen.getByRole('link', { name: /cancellation and rescheduling policy text/i })).toHaveAttribute('href', '#policy')
    expect(screen.getByRole('button', { name: /publish to marketplace/i })).toBeDisabled()
  })

  it('shows truthful staging-only payment/subscription copy without editable controls, and allows publishing once ready', async () => {
    const readiness = { status: 'SETUP', ready: true, blockers: [] }
    const action = vi.fn().mockResolvedValue({ ok: true, status: 'PUBLISHED', blockers: [] })
    render(<PublicationSettings readiness={readiness} integrationStatus={getIntegrationStagingStatus()} action={action} />)

    expect(screen.getByText(/not available in this environment/i)).toBeVisible()
    expect(screen.getByText(/no subscription charges or commissions are applied/i)).toBeVisible()
    expect(screen.queryByRole('button', { name: /connect/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /enable/i })).not.toBeInTheDocument()

    const button = screen.getByRole('button', { name: /publish to marketplace/i })
    expect(button).toBeEnabled()
    fireEvent.click(button)
    expect(await screen.findByRole('status')).toHaveTextContent(/published/i)
  })

  it('offers an unpublish action once published, without claiming storefront history is deleted', () => {
    const readiness = { status: 'PUBLISHED', ready: true, blockers: [] }
    render(<PublicationSettings readiness={readiness} integrationStatus={getIntegrationStagingStatus()} action={vi.fn()} />)

    expect(screen.getByRole('button', { name: /unpublish from marketplace/i })).toBeEnabled()
    expect(screen.getByText(/without deleting/i)).toBeVisible()
  })
})

describe('Business settings page', () => {
  const mocks = vi.hoisted(() => ({
    requireWorkspaceRole: vi.fn(),
    loadBusinessPolicy: vi.fn(),
    getPublicationReadiness: vi.fn(),
  }))

  vi.mock('@/modules/organizations/context', () => ({ requireWorkspaceRole: mocks.requireWorkspaceRole }))
  vi.mock('@/modules/settings/business-policy', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/modules/settings/business-policy')>()
    return { ...actual, loadBusinessPolicy: mocks.loadBusinessPolicy }
  })
  vi.mock('@/modules/settings/publication-readiness', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/modules/settings/publication-readiness')>()
    return { ...actual, getPublicationReadiness: mocks.getPublicationReadiness }
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.loadBusinessPolicy.mockResolvedValue(policy)
    mocks.getPublicationReadiness.mockResolvedValue({ status: 'SETUP', ready: false, blockers: [{ code: 'NO_ACTIVE_LOCATION', message: 'Add an active location', href: '/business/locations' }] })
  })

  it('denies access to non-owners at the server boundary, not just by hiding navigation', async () => {
    mocks.requireWorkspaceRole.mockRejectedValue(new Error('BUSINESS_ACCESS_DENIED'))
    const { default: SettingsPage } = await import('@/app/business/settings/page')

    await expect(SettingsPage()).rejects.toThrow('BUSINESS_ACCESS_DENIED')
    expect(mocks.requireWorkspaceRole).toHaveBeenCalledWith(['OWNER'])
  })

  it('renders separated profile, policy, and publication sections for an Owner', async () => {
    mocks.requireWorkspaceRole.mockResolvedValue({ actor: { id: 'owner-1' }, business: { id: 'business-1', name: 'Island Glow', slug: 'island-glow', description: null, phone: null, email: null, status: 'SETUP' }, membership: { id: 'owner-membership', role: 'OWNER' } })
    const { default: SettingsPage } = await import('@/app/business/settings/page')

    render(await SettingsPage())

    expect(document.getElementById('profile')).not.toBeNull()
    expect(document.getElementById('policy')).not.toBeNull()
    expect(document.getElementById('publication')).not.toBeNull()
    expect(screen.getByRole('link', { name: /add an active location/i })).toHaveAttribute('href', '/business/locations')
  })
})
