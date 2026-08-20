import { intervalContains, intervalsOverlap } from './intervals'
import type {
  AvailabilityProfessional,
  AvailableStart,
  ProposedSegment,
  RequestedService,
  TimeInterval,
} from './types'

const minutes = (value: number) => value * 60_000

export function buildServiceSequence(input: {
  start: Date
  services: RequestedService[]
  professionals: Array<Pick<AvailabilityProfessional, 'membershipId' | 'qualifiedOfferingIds'>>
}): ProposedSegment[] {
  let cursor = new Date(input.start)
  const professionals = [...input.professionals].sort((a, b) => a.membershipId.localeCompare(b.membershipId))
  return input.services.map((service) => {
    if (service.attendeeCount < 1 || service.attendeeCount > service.capacity) {
      throw new Error('ATTENDEE_CAPACITY_EXCEEDED')
    }
    const professional = professionals.find((candidate) => candidate.qualifiedOfferingIds.includes(service.offeringId))
    if (!professional) throw new Error('NO_QUALIFIED_PROFESSIONAL')
    const start = new Date(cursor.getTime() + minutes(service.preparationMinutes))
    const end = new Date(start.getTime() + minutes(service.durationMinutes))
    const occupiedStart = new Date(start.getTime() - minutes(service.preparationMinutes))
    const occupiedEnd = new Date(end.getTime() + minutes(service.cleanupMinutes))
    cursor = occupiedEnd
    return {
      offeringId: service.offeringId,
      membershipId: professional.membershipId,
      start,
      end,
      occupiedStart,
      occupiedEnd,
      attendeeCount: service.attendeeCount,
    }
  })
}

const isSequenceAvailable = (
  segments: ProposedSegment[],
  professionals: AvailabilityProfessional[],
  window: TimeInterval,
  locationHours: TimeInterval[],
) => segments.every((segment) => {
  const professional = professionals.find((candidate) => candidate.membershipId === segment.membershipId)
  if (!professional) return false
  const occupied = { start: segment.occupiedStart, end: segment.occupiedEnd }
  const working = professional.working ?? [window]
  const blocked = [...(professional.timeOff ?? []), ...(professional.occupied ?? [])]
  return intervalContains(window, occupied)
    && locationHours.some((interval) => intervalContains(interval, occupied))
    && working.some((interval) => intervalContains(interval, occupied))
    && !blocked.some((interval) => intervalsOverlap(interval, occupied))
})

export function findAvailableStarts(input: {
  window: TimeInterval
  incrementMinutes?: number
  services: RequestedService[]
  professionals: AvailabilityProfessional[]
  locationHours?: TimeInterval[]
}): AvailableStart[] {
  const increment = input.incrementMinutes ?? 15
  if (increment < 1) throw new Error('INVALID_INCREMENT')
  const starts: AvailableStart[] = []
  for (let cursor = input.window.start.getTime(); cursor < input.window.end.getTime(); cursor += minutes(increment)) {
    try {
      const segments = buildServiceSequence({
        start: new Date(cursor),
        services: input.services,
        professionals: input.professionals,
      })
      if (isSequenceAvailable(segments, input.professionals, input.window, input.locationHours ?? [input.window])) {
        starts.push({ start: segments[0]?.start ?? new Date(cursor), segments })
      }
    } catch (error) {
      if (!(error instanceof Error) || !['NO_QUALIFIED_PROFESSIONAL', 'ATTENDEE_CAPACITY_EXCEEDED'].includes(error.message)) {
        throw error
      }
    }
  }
  return starts
}
