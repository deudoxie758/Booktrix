import { describe, expect, it, vi } from 'vitest'

import { recordSchedulingOverride } from '@/modules/bookings/overrides'

describe('scheduling overrides', () => {
  it('requires a reason and creates an immutable override audit', async () => {
    const create = vi.fn()
    await expect(recordSchedulingOverride({ segmentId: 'segment-1', actorUserId: 'manager-1', reason: '', previousValues: {}, resultingValues: {} }, { create })).rejects.toThrow('OVERRIDE_REASON_REQUIRED')
    expect(create).not.toHaveBeenCalled()
  })

  it('exposes only create on the override writer boundary', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'override-1' })
    await recordSchedulingOverride({ segmentId: 'segment-1', actorUserId: 'manager-1', reason: ' Capacity exception ', previousValues: {}, resultingValues: {} }, { create })
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ reason: 'Capacity exception' }) })
  })
})
