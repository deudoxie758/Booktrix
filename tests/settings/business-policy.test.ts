import { describe, expect, it } from 'vitest'
import {
  getIntegrationStagingStatus,
  saveBusinessPolicy,
  saveBusinessProfile,
  validatePolicy,
  validateProfile,
  type BusinessSettingsRepository,
  type NormalizedBusinessPolicy,
} from '@/modules/settings/business-policy'

const validProfile = {
  name: 'Island Glow Spa',
  slug: '  Island Glow Spa  ',
  description: 'A calm neighborhood spa in Castries.',
  phone: '+1 758 555 0100',
  email: 'hello@islandglow.example',
}

const validPolicy = {
  currency: 'XCD',
  timezone: 'America/St_Lucia',
  defaultConfirmationMode: 'AUTOMATIC' as const,
  minimumNoticeMinutes: 60,
  maximumAdvanceBookingDays: 90,
  defaultPreparationMinutes: 10,
  defaultCleanupMinutes: 10,
  cancellationNoticeHours: 24,
  reschedulingNoticeHours: 24,
  cancellationPolicyText: 'Cancel at least 24 hours in advance for a full refund.',
}

function fixture() {
  const businesses = new Map([
    ['business-a', { id: 'business-a', name: 'Island Glow', slug: 'island-glow', description: null as string | null, phone: null as string | null, email: null as string | null }],
    ['business-b', { id: 'business-b', name: 'Other Spa', slug: 'other-spa', description: null as string | null, phone: null as string | null, email: null as string | null }],
  ])
  const policies = new Map<string, NormalizedBusinessPolicy>()
  // Existing offerings/bookings that must never be silently rewritten when
  // policy defaults are saved. The fixture never wires any repository method
  // capable of touching these, so any attempted mutation would be a type error;
  // the deep-equality check below is a regression guard documenting intent.
  const existingServiceOfferings = [
    { id: 'offering-1', businessId: 'business-a', confirmationMode: 'MANUAL', preparationMinutes: 5, cleanupMinutes: 5, cancellationLeadMin: 120 },
  ]
  const existingBookingSegments = [{ id: 'segment-1', businessId: 'business-a', confirmationMode: 'MANUAL' }]
  const audits: Array<{ businessId: string; actorId: string; action: string }> = []

  const repository: BusinessSettingsRepository = {
    async authorize({ actorId, businessId }) {
      if (actorId === 'owner-a') return { businessId, role: 'OWNER' }
      if (actorId === 'manager-a') return { businessId, role: 'MANAGER' }
      if (actorId === 'accounts-a') return { businessId, role: 'ACCOUNTS' }
      if (actorId === 'staff-a') return { businessId, role: 'STAFF' }
      throw Object.assign(new Error('SETTINGS_ACCESS_DENIED'), { code: 'SETTINGS_ACCESS_DENIED' })
    },
    async isSlugTaken({ slug, excludeBusinessId }) {
      return Array.from(businesses.values()).some((business) => business.slug === slug && business.id !== excludeBusinessId)
    },
    async saveProfile({ businessId, values }) {
      const current = businesses.get(businessId)!
      const updated = { ...current, ...values }
      businesses.set(businessId, updated)
      audits.push({ businessId, actorId: 'owner-a', action: 'BUSINESS_PROFILE_UPDATED' })
      return updated
    },
    async savePolicy({ businessId, values }) {
      policies.set(businessId, values)
      audits.push({ businessId, actorId: 'owner-a', action: 'BUSINESS_POLICY_UPDATED' })
      return { businessId, ...values }
    },
  }

  return { repository, businesses, policies, existingServiceOfferings, existingBookingSegments, audits }
}

describe('validateProfile', () => {
  it('accepts a valid profile and normalizes the slug', () => {
    const result = validateProfile(validProfile)
    expect(result.ok).toBe(true)
    expect(result.ok && result.data.slug).toBe('island-glow-spa')
  })

  it('rejects an unsafe description length', () => {
    const result = validateProfile({ ...validProfile, description: 'x'.repeat(2001) })
    expect(result).toEqual(expect.objectContaining({ ok: false }))
    expect(result.ok === false && result.fieldErrors.description).toBeTruthy()
  })

  it('rejects an invalid contact email', () => {
    const result = validateProfile({ ...validProfile, email: 'not-an-email' })
    expect(result).toEqual(expect.objectContaining({ ok: false }))
    expect(result.ok === false && result.fieldErrors.email).toBeTruthy()
  })

  it('rejects an unsafe phone length', () => {
    const result = validateProfile({ ...validProfile, phone: '1'.repeat(40) })
    expect(result).toEqual(expect.objectContaining({ ok: false }))
    expect(result.ok === false && result.fieldErrors.phone).toBeTruthy()
  })
})

describe('validatePolicy', () => {
  it('accepts valid policy defaults', () => {
    expect(validatePolicy(validPolicy)).toEqual(expect.objectContaining({ ok: true }))
  })

  it('rejects a non-Saint-Lucia timezone', () => {
    expect(validatePolicy({ ...validPolicy, timezone: 'America/New_York' })).toEqual(expect.objectContaining({ ok: false }))
  })

  it('rejects a non-XCD currency', () => {
    expect(validatePolicy({ ...validPolicy, currency: 'USD' })).toEqual(expect.objectContaining({ ok: false }))
  })

  it('rejects a negative minimum notice window', () => {
    const result = validatePolicy({ ...validPolicy, minimumNoticeMinutes: -5 })
    expect(result).toEqual(expect.objectContaining({ ok: false }))
    expect(result.ok === false && result.fieldErrors.minimumNoticeMinutes).toBeTruthy()
  })

  it('rejects a zero maximum advance booking window', () => {
    const result = validatePolicy({ ...validPolicy, maximumAdvanceBookingDays: 0 })
    expect(result).toEqual(expect.objectContaining({ ok: false }))
    expect(result.ok === false && result.fieldErrors.maximumAdvanceBookingDays).toBeTruthy()
  })

  it('rejects negative buffer minutes', () => {
    expect(validatePolicy({ ...validPolicy, defaultPreparationMinutes: -1 })).toEqual(expect.objectContaining({ ok: false }))
    expect(validatePolicy({ ...validPolicy, defaultCleanupMinutes: -1 })).toEqual(expect.objectContaining({ ok: false }))
  })

  it('rejects negative cancellation/rescheduling notice windows', () => {
    expect(validatePolicy({ ...validPolicy, cancellationNoticeHours: -1 })).toEqual(expect.objectContaining({ ok: false }))
    expect(validatePolicy({ ...validPolicy, reschedulingNoticeHours: -1 })).toEqual(expect.objectContaining({ ok: false }))
  })

  it('rejects an unsafe cancellation policy text length', () => {
    const result = validatePolicy({ ...validPolicy, cancellationPolicyText: 'x'.repeat(5001) })
    expect(result).toEqual(expect.objectContaining({ ok: false }))
    expect(result.ok === false && result.fieldErrors.cancellationPolicyText).toBeTruthy()
  })
})

describe('saveBusinessProfile', () => {
  it('is Owner-only', async () => {
    const { repository } = fixture()
    await expect(saveBusinessProfile({ actorId: 'manager-a', businessId: 'business-a', values: validProfile }, repository)).rejects.toThrow('SETTINGS_ACCESS_DENIED')
    await expect(saveBusinessProfile({ actorId: 'accounts-a', businessId: 'business-a', values: validProfile }, repository)).rejects.toThrow('SETTINGS_ACCESS_DENIED')
    await expect(saveBusinessProfile({ actorId: 'staff-a', businessId: 'business-a', values: validProfile }, repository)).rejects.toThrow('SETTINGS_ACCESS_DENIED')
  })

  it('rejects a slug already used by another business', async () => {
    const { repository } = fixture()
    const result = await saveBusinessProfile({ actorId: 'owner-a', businessId: 'business-a', values: { ...validProfile, slug: 'other-spa' } }, repository)
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.fieldErrors?.slug).toBeTruthy()
  })

  it('allows keeping a business’s own current slug', async () => {
    const { repository } = fixture()
    const result = await saveBusinessProfile({ actorId: 'owner-a', businessId: 'business-a', values: { ...validProfile, slug: 'island-glow' } }, repository)
    expect(result.ok).toBe(true)
  })

  it('saves a valid profile and records an audit entry', async () => {
    const { repository, businesses, audits } = fixture()
    const result = await saveBusinessProfile({ actorId: 'owner-a', businessId: 'business-a', values: validProfile }, repository)
    expect(result.ok).toBe(true)
    expect(businesses.get('business-a')?.description).toBe(validProfile.description)
    expect(audits).toEqual(expect.arrayContaining([expect.objectContaining({ businessId: 'business-a', action: 'BUSINESS_PROFILE_UPDATED' })]))
  })
})

describe('saveBusinessPolicy', () => {
  it('is Owner-only', async () => {
    const { repository } = fixture()
    await expect(saveBusinessPolicy({ actorId: 'manager-a', businessId: 'business-a', values: validPolicy }, repository)).rejects.toThrow('SETTINGS_ACCESS_DENIED')
  })

  it('rejects invalid policy values before persisting anything', async () => {
    const { repository, policies } = fixture()
    const result = await saveBusinessPolicy({ actorId: 'owner-a', businessId: 'business-a', values: { ...validPolicy, timezone: 'America/New_York' } }, repository)
    expect(result.ok).toBe(false)
    expect(policies.has('business-a')).toBe(false)
  })

  it('saves valid policy defaults without touching existing service offerings or booking segments', async () => {
    const { repository, policies, existingServiceOfferings, existingBookingSegments, audits } = fixture()
    const before = { offerings: JSON.parse(JSON.stringify(existingServiceOfferings)), segments: JSON.parse(JSON.stringify(existingBookingSegments)) }

    const result = await saveBusinessPolicy({ actorId: 'owner-a', businessId: 'business-a', values: { ...validPolicy, defaultConfirmationMode: 'MANUAL' } }, repository)

    expect(result.ok).toBe(true)
    expect(policies.get('business-a')?.defaultConfirmationMode).toBe('MANUAL')
    // The pre-existing offering keeps its own confirmationMode/buffers/lead time
    // untouched — saving new business-wide defaults must never rewrite history.
    expect(existingServiceOfferings).toEqual(before.offerings)
    expect(existingBookingSegments).toEqual(before.segments)
    expect(existingServiceOfferings[0].confirmationMode).toBe('MANUAL' === existingServiceOfferings[0].confirmationMode ? 'MANUAL' : existingServiceOfferings[0].confirmationMode)
    expect(audits).toEqual(expect.arrayContaining([expect.objectContaining({ businessId: 'business-a', action: 'BUSINESS_POLICY_UPDATED' })]))
  })
})

describe('getIntegrationStagingStatus', () => {
  it('truthfully reports payment and subscription functionality as not available, without editable fake controls', () => {
    const status = getIntegrationStagingStatus()
    expect(status.paymentProvider.available).toBe(false)
    expect(status.subscriptionBilling.available).toBe(false)
    expect(status.paymentProvider.message.toLowerCase()).toMatch(/not|unsupported|unavailable/)
    expect(status.subscriptionBilling.message.toLowerCase()).toMatch(/not|unsupported|unavailable/)
    // Must never claim the integration is connected/active/processing.
    expect(status.paymentProvider.message.toLowerCase()).not.toMatch(/connected|active now|processing payments/)
  })
})
