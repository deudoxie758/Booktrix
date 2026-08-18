import { intervalContains, intervalsOverlap } from './intervals'
import type { HoldSegment } from './holds'
import type { TimeInterval } from './types'

type RecurringInterval = { weekday: number; startMinute: number; endMinute: number }

export type SchedulingSnapshot = {
  businessId: string
  businessPublished: boolean
  location: {
    id: string
    businessId: string
    active: boolean
    timezone: string
    hours: RecurringInterval[]
  }
  offerings: Array<{
    id: string
    businessId: string
    active: boolean
    durationMinutes: number
    preparationMinutes: number
    cleanupMinutes: number
    capacity: number
    priceCents: number
  }>
  professionals: Array<{
    membershipId: string
    businessId: string
    active: boolean
    assignedLocationIds: string[]
    qualifiedOfferingIds: string[]
    schedules: RecurringInterval[]
    timeOff: TimeInterval[]
  }>
  occupied: Array<{ membershipId: string; start: Date; end: Date; attendeeCount: number }>
}

type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number }

const zonedParts = (date: Date, timezone: string): ZonedParts => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value)
  return { year: value('year'), month: value('month'), day: value('day'), hour: value('hour'), minute: value('minute') }
}

const weekday = ({ year, month, day }: ZonedParts) => new Date(Date.UTC(year, month - 1, day)).getUTCDay()

const zonedDateTime = (year: number, month: number, day: number, minute: number, timezone: string) => {
  const target = Date.UTC(year, month - 1, day, Math.floor(minute / 60), minute % 60)
  let instant = target
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const actual = zonedParts(new Date(instant), timezone)
    const represented = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute)
    instant += target - represented
  }
  return new Date(instant)
}

export function recurringIntervalsForRange(
  rows: RecurringInterval[],
  rangeStart: Date,
  rangeEnd: Date,
  timezone: string,
): TimeInterval[] {
  if (rangeStart >= rangeEnd) throw new Error('INVALID_DATE_RANGE')
  const localStart = zonedParts(new Date(rangeStart.getTime() - 86_400_000), timezone)
  const localEnd = zonedParts(new Date(rangeEnd.getTime() + 86_400_000), timezone)
  const firstDay = Date.UTC(localStart.year, localStart.month - 1, localStart.day)
  const lastDay = Date.UTC(localEnd.year, localEnd.month - 1, localEnd.day)
  const intervals: TimeInterval[] = []
  for (let day = firstDay; day <= lastDay; day += 86_400_000) {
    const date = new Date(day)
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth() + 1
    const dateOfMonth = date.getUTCDate()
    for (const row of rows.filter((candidate) => candidate.weekday === date.getUTCDay())) {
      const interval = {
        start: zonedDateTime(year, month, dateOfMonth, row.startMinute, timezone),
        end: zonedDateTime(year, month, dateOfMonth, row.endMinute, timezone),
      }
      if (interval.start < rangeEnd && interval.end > rangeStart) intervals.push(interval)
    }
  }
  return intervals
}

const matchingRecurringInterval = (interval: TimeInterval, rows: RecurringInterval[], timezone: string) => {
  const start = zonedParts(interval.start, timezone)
  const lastOccupiedMoment = zonedParts(new Date(interval.end.getTime() - 1), timezone)
  if (start.year !== lastOccupiedMoment.year || start.month !== lastOccupiedMoment.month || start.day !== lastOccupiedMoment.day) return false
  const startMinute = start.hour * 60 + start.minute
  const endParts = zonedParts(interval.end, timezone)
  const endMinute = endParts.hour * 60 + endParts.minute
  return rows.some((row) => row.weekday === weekday(start) && row.startMinute <= startMinute && row.endMinute >= endMinute)
}

const unavailable = (code = 'SLOT_UNAVAILABLE') => Object.assign(new Error(code), { code })

export function deriveValidatedSegments(
  input: {
    businessId: string
    locationId: string
    segments: Array<{ offeringId: string; membershipId: string; start: Date; attendeeCount: number }>
  },
  snapshot: SchedulingSnapshot,
  options: { overrideAvailability?: boolean } = {},
): HoldSegment[] {
  if (!snapshot.businessPublished || snapshot.businessId !== input.businessId
    || snapshot.location.id !== input.locationId || snapshot.location.businessId !== input.businessId
    || !snapshot.location.active || !input.segments.length) throw unavailable('INVALID_SELECTION')

  let previousOccupiedEnd: Date | undefined
  return input.segments.map((requested) => {
    const offering = snapshot.offerings.find((candidate) => candidate.id === requested.offeringId)
    const professional = snapshot.professionals.find((candidate) => candidate.membershipId === requested.membershipId)
    if (!offering || offering.businessId !== input.businessId || !offering.active
      || !professional || professional.businessId !== input.businessId || !professional.active
      || !professional.assignedLocationIds.includes(input.locationId)
      || !professional.qualifiedOfferingIds.includes(offering.id)
      || requested.attendeeCount < 1
      || (!options.overrideAvailability && requested.attendeeCount > offering.capacity)) throw unavailable()

    const start = new Date(requested.start)
    const end = new Date(start.getTime() + offering.durationMinutes * 60_000)
    const occupiedStart = new Date(start.getTime() - offering.preparationMinutes * 60_000)
    const occupiedEnd = new Date(end.getTime() + offering.cleanupMinutes * 60_000)
    if (previousOccupiedEnd && occupiedStart.getTime() !== previousOccupiedEnd.getTime()) throw unavailable('INVALID_SEQUENCE')
    previousOccupiedEnd = occupiedEnd
    const occupiedInterval = { start: occupiedStart, end: occupiedEnd }
    if (!options.overrideAvailability && (!matchingRecurringInterval(occupiedInterval, snapshot.location.hours, snapshot.location.timezone)
      || !matchingRecurringInterval(occupiedInterval, professional.schedules, snapshot.location.timezone)
      || professional.timeOff.some((interval) => intervalsOverlap(interval, occupiedInterval)))) throw unavailable()

    const professionalConflict = snapshot.occupied
      .some((item) => item.membershipId === professional.membershipId && intervalsOverlap(item, occupiedInterval))
    if (!options.overrideAvailability && professionalConflict) throw unavailable()

    return {
      offeringId: offering.id,
      locationId: input.locationId,
      membershipId: professional.membershipId,
      start,
      end,
      occupiedStart,
      occupiedEnd,
      attendeeCount: requested.attendeeCount,
      capacity: offering.capacity,
      priceCents: offering.priceCents * requested.attendeeCount,
    }
  })
}
