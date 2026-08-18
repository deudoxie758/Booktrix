import { describe, expect, it, vi } from 'vitest'
import { saveStaffSchedule } from '@/modules/scheduling/management'

describe('schedule management', () => {
  it('rejects overlapping schedule intervals', async () => {
    await expect(saveStaffSchedule({ businessId: 'business-1', locationId: 'location-1', membershipId: 'member-1', weekday: 1, intervals: [['09:00', '13:00'], ['12:00', '16:00']] }, { authorize: vi.fn(), persist: vi.fn() })).rejects.toThrow('OVERLAPPING_SCHEDULE')
  })
})
