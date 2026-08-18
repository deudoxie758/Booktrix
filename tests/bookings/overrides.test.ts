import { describe, expect, it, vi } from 'vitest'

import { recordSchedulingOverride } from '@/modules/bookings/overrides'

describe('scheduling overrides', () => {
  it('requires a reason and creates an immutable override audit', async () => {
    const create = vi.fn()
    await expect(recordSchedulingOverride({ segmentId: 'segment-1', actorUserId: 'manager-1', reason: '', previousValues: {}, resultingValues: {} }, { create })).rejects.toThrow('OVERRIDE_REASON_REQUIRED')
    expect(create).not.toHaveBeenCalled()
  })
})
