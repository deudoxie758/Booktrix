import { describe, expect, it, vi } from 'vitest'
import { saveOffering } from '@/modules/catalog/management'

describe('catalog management', () => {
  it('rejects capacity below one and a percentage deposit above one hundred', async () => {
    await expect(saveOffering({ businessId: 'business-1', actorId: 'manager-1', name: 'Consultation', category: 'Professional services', durationMinutes: 60, preparationMinutes: 0, cleanupMinutes: 0, priceCents: 12000, capacity: 0, confirmationMode: 'AUTOMATIC', allowFullPayment: true, allowDeposit: true, allowCash: true, depositKind: 'PERCENTAGE', depositValue: 125, locationIds: ['location-1'] }, { authorize: vi.fn(), persist: vi.fn() })).rejects.toMatchObject({ code: 'INVALID_OFFERING' })
  })
})
