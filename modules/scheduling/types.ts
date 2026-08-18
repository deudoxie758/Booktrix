export type TimeInterval = { start: Date; end: Date }

export type RequestedService = {
  offeringId: string
  durationMinutes: number
  preparationMinutes: number
  cleanupMinutes: number
  attendeeCount: number
  capacity: number
}

export type AvailabilityProfessional = {
  membershipId: string
  working?: TimeInterval[]
  timeOff?: TimeInterval[]
  occupied?: TimeInterval[]
  qualifiedOfferingIds: string[]
}

export type ProposedSegment = {
  offeringId: string
  membershipId: string
  start: Date
  end: Date
  occupiedStart: Date
  occupiedEnd: Date
  attendeeCount: number
}

export type AvailableStart = { start: Date; segments: ProposedSegment[] }
