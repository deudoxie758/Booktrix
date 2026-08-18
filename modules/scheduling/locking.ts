export function schedulingRequestLockKeys(input: {
  businessId: string
  locationId: string
  offeringId: string
  membershipId: string
  start: Date
}) {
  const day = Date.UTC(input.start.getUTCFullYear(), input.start.getUTCMonth(), input.start.getUTCDate())
  return [-1, 0, 1].map((offset) =>
    `${input.businessId}:professional:${input.membershipId}:${new Date(day + offset * 86_400_000).toISOString()}`,
  )
}

export function schedulingLockBucketAt(lockKey: string) {
  const timestamp = lockKey.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)$/)?.[1]
  if (!timestamp) throw new Error('INVALID_SCHEDULING_LOCK_KEY')
  return new Date(timestamp)
}

export function acquireSchedulingLock(
  client: Pick<Prisma.TransactionClient, '$executeRaw'>,
  input: { lockKey: string; businessId: string; locationId: string; bucketAt: Date },
) {
  return client.$executeRaw`
    INSERT INTO SchedulingLock (id, lockKey, businessId, locationId, bucketAt, updatedAt)
    VALUES (${randomUUID()}, ${input.lockKey}, ${input.businessId}, ${input.locationId}, ${input.bucketAt}, CURRENT_TIMESTAMP(3))
    ON DUPLICATE KEY UPDATE bucketAt = VALUES(bucketAt), updatedAt = VALUES(updatedAt)
  `
}
import { randomUUID } from 'node:crypto'

import type { Prisma } from '@prisma/client'
