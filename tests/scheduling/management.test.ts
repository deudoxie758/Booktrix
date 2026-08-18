import { describe, expect, it, vi } from 'vitest'
import { saveStaffSchedule } from '@/modules/scheduling/management'

describe('schedule management', () => {
  it('rejects overlapping schedule intervals', async () => {
    await expect(saveStaffSchedule({ businessId: 'business-1', locationId: 'location-1', membershipId: 'member-1', weekday: 1, intervals: [['09:00', '13:00'], ['12:00', '16:00']] }, { authorize: vi.fn(), persist: vi.fn() })).rejects.toThrow('OVERLAPPING_SCHEDULE')
  })

  it('rejects a membership from another business before persistence', async () => {
    const persist = vi.fn()
    await expect(saveStaffSchedule({ businessId: 'business-1', locationId: 'location-1', membershipId: 'other-business-member', weekday: 1, intervals: [['09:00', '17:00']] }, {
      authorize: vi.fn(),
      validateTenantIntegrity: vi.fn().mockRejectedValue(Object.assign(new Error('TENANT_MISMATCH'), { code: 'INVALID_SCHEDULE' })),
      persist,
    })).rejects.toMatchObject({ code: 'INVALID_SCHEDULE' })
    expect(persist).not.toHaveBeenCalled()
  })
})
