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
