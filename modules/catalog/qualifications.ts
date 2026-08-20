type Qualification = {
  membershipId: string
  offeringId: string
  locationId: string
  active: boolean
}

export function isStaffEligible(input: {
  membershipId: string
  offeringId: string
  locationId: string
  activeMembershipIds: string[]
  assignedLocationIds: string[]
  qualifications: Qualification[]
}): boolean {
  return input.activeMembershipIds.includes(input.membershipId)
    && input.assignedLocationIds.includes(input.locationId)
    && input.qualifications.some((qualification) =>
      qualification.active
      && qualification.membershipId === input.membershipId
      && qualification.offeringId === input.offeringId
      && qualification.locationId === input.locationId,
    )
}
