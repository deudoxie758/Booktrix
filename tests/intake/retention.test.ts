import { describe, expect, it, vi } from 'vitest'
import { purgeExpiredSensitiveIntake, sensitiveIntakeCutoff } from '@/modules/intake/retention'

describe('sensitive intake retention', () => {
  it('calculates a deterministic retention cutoff', () => {
    expect(sensitiveIntakeCutoff(new Date('2026-09-24T12:00:00.000Z'), 365).toISOString()).toBe('2025-09-24T12:00:00.000Z')
  })

  it('clears only encrypted response material older than the retention period', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 3 })
    const result = await purgeExpiredSensitiveIntake({
      now: new Date('2026-09-24T12:00:00.000Z'),
      retentionDays: 365,
      db: { bookingOrder: { updateMany } } as any,
    })

    expect(result).toEqual({ purged: 3, cutoff: new Date('2025-09-24T12:00:00.000Z') })
    expect(updateMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: new Date('2025-09-24T12:00:00.000Z') }, sensitiveIntakeCiphertext: { not: null } },
      data: { sensitiveIntakeCiphertext: null, sensitiveIntakeIv: null, sensitiveIntakeTag: null, sensitiveIntakePurgedAt: new Date('2026-09-24T12:00:00.000Z') },
    })
  })

  it('rejects unsafe retention windows', async () => {
    await expect(purgeExpiredSensitiveIntake({ retentionDays: 0, db: {} as any })).rejects.toThrow('INTAKE_RETENTION_DAYS_INVALID')
  })
})
