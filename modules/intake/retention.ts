import { prisma } from '@/lib/prisma'

const DAY_MS = 86_400_000

export function sensitiveIntakeCutoff(now: Date, retentionDays: number) {
  if (!Number.isInteger(retentionDays) || retentionDays < 30) throw new Error('INTAKE_RETENTION_DAYS_INVALID')
  return new Date(now.getTime() - retentionDays * DAY_MS)
}

export async function purgeExpiredSensitiveIntake(input: { now?: Date; retentionDays?: number; db?: typeof prisma } = {}) {
  const now = input.now ?? new Date()
  const retentionDays = input.retentionDays ?? 365
  const cutoff = sensitiveIntakeCutoff(now, retentionDays)
  const result = await (input.db ?? prisma).bookingOrder.updateMany({
    where: { createdAt: { lt: cutoff }, sensitiveIntakeCiphertext: { not: null } },
    data: { sensitiveIntakeCiphertext: null, sensitiveIntakeIv: null, sensitiveIntakeTag: null, sensitiveIntakePurgedAt: now },
  })
  return { purged: result.count, cutoff }
}
