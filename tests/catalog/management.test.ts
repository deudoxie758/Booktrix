import { describe, expect, it, vi } from 'vitest'
import { saveOffering } from '@/modules/catalog/management'

describe('catalog management', () => {
  it('rejects capacity below one and a percentage deposit above one hundred', async () => {
    await expect(saveOffering({ businessId: 'business-1', actorId: 'manager-1', name: 'Consultation', category: 'Professional services', durationMinutes: 60, preparationMinutes: 0, cleanupMinutes: 0, priceCents: 12000, capacity: 0, confirmationMode: 'AUTOMATIC', allowFullPayment: true, allowDeposit: true, allowCash: true, depositKind: 'PERCENTAGE', depositValue: 125, locationIds: ['location-1'] }, { authorize: vi.fn(), persist: vi.fn() })).rejects.toMatchObject({ code: 'INVALID_OFFERING' })
  })

  it('rejects cross-business service locations before persistence', async () => {
    const persist = vi.fn()
    await expect(saveOffering({ businessId: 'business-1', actorId: 'manager-1', name: 'Consultation', category: 'Professional services', durationMinutes: 60, preparationMinutes: 0, cleanupMinutes: 0, priceCents: 12000, capacity: 1, confirmationMode: 'AUTOMATIC', allowFullPayment: true, allowDeposit: false, allowCash: true, depositKind: null, depositValue: null, locationIds: ['other-business-location'] }, {
      authorize: vi.fn(),
      validateTenantIntegrity: vi.fn().mockRejectedValue(Object.assign(new Error('TENANT_MISMATCH'), { code: 'INVALID_OFFERING' })),
      persist,
    })).rejects.toMatchObject({ code: 'INVALID_OFFERING' })
    expect(persist).not.toHaveBeenCalled()
  })
})
