const BUCKET_MS = 15 * 60_000

export function schedulingLockKeys(input: {
  businessId: string
  locationId: string
  membershipId: string
  occupiedStart: Date
  occupiedEnd: Date
}) {
  const first = Math.floor(input.occupiedStart.getTime() / BUCKET_MS) * BUCKET_MS
  const keys: string[] = []
  for (let bucket = first; bucket < input.occupiedEnd.getTime(); bucket += BUCKET_MS) {
    keys.push(`${input.businessId}:${input.locationId}:${input.membershipId}:${new Date(bucket).toISOString()}`)
  }
  return keys
}
