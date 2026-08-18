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
