import { NextResponse } from 'next/server'
import { z } from 'zod'

import { summarizeAvailableDates } from '@/modules/scheduling/date-summary'
import { loadSchedulingFacts } from '@/modules/scheduling/repository'
import { recurringIntervalsForRange, zonedDateTime } from '@/modules/scheduling/validation'

const datePattern = /^\d{4}-\d{2}-\d{2}$/
const querySchema = z.object({
  businessId: z.string().min(1),
  locationId: z.string().min(1),
  offeringIds: z.string().transform((value) => value.split(',').filter(Boolean)).pipe(z.array(z.string()).min(1)),
  attendeeCounts: z.string().transform((value) => value.split(',').map(Number)).pipe(z.array(z.number().int().min(1)).min(1)),
  from: z.string().regex(datePattern),
  to: z.string().regex(datePattern),
})

const utcDate = (value: string) => {
  const [year, month, date] = value.split('-').map(Number)
  return new Date(Date.UTC(year!, month! - 1, date!))
}

const dateWindows = (from: string, to: string, timezone: string) => {
  const first = utcDate(from)
  const last = utcDate(to)
  const windows = []
  for (let cursor = first.getTime(); cursor <= last.getTime(); cursor += 86_400_000) {
    const date = new Date(cursor)
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth() + 1
    const day = date.getUTCDate()
    windows.push({
      date: date.toISOString().slice(0, 10),
      start: zonedDateTime(year, month, day, 0, timezone),
      end: zonedDateTime(year, month, day + 1, 0, timezone),
    })
  }
  return windows
}

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!parsed.success || parsed.data.offeringIds.length !== parsed.data.attendeeCounts.length) {
    return NextResponse.json({ code: 'INVALID_SELECTION', message: 'Check the selected services and date range.' }, { status: 422 })
  }
  const input = parsed.data
  const from = utcDate(input.from)
  const to = utcDate(input.to)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to || to.getTime() - from.getTime() > 93 * 86_400_000) {
    return NextResponse.json({ code: 'INVALID_SELECTION', message: 'Choose a valid date range.' }, { status: 422 })
  }

  try {
    const broadStart = new Date(from.getTime() - 86_400_000)
    const broadEnd = new Date(to.getTime() + 2 * 86_400_000)
    const facts = await loadSchedulingFacts({
      businessId: input.businessId, locationId: input.locationId, offeringIds: input.offeringIds,
      rangeStart: broadStart, rangeEnd: broadEnd,
    })
    if (facts.offerings.length !== input.offeringIds.length) {
      return NextResponse.json({ code: 'INVALID_SELECTION', message: 'One or more services are unavailable.' }, { status: 422 })
    }
    const timezone = facts.location.timezone
    const professionals = Array.from(new Set(facts.qualifications.map((item) => item.membershipId))).sort().map((membershipId) => ({
      membershipId,
      qualifiedOfferingIds: facts.qualifications.filter((item) => item.membershipId === membershipId).map((item) => item.offeringId),
      working: recurringIntervalsForRange(facts.schedules.filter((item) => item.membershipId === membershipId), broadStart, broadEnd, timezone),
      timeOff: facts.timeOff.filter((item) => item.membershipId === membershipId).map((item) => ({ start: item.startsAt, end: item.endsAt })),
      occupied: [
        ...facts.segments.filter((item) => item.membershipId === membershipId).map((item) => ({ start: item.occupiedStartsAt, end: item.occupiedEndsAt })),
        ...facts.holds.filter((item) => item.membershipId === membershipId).map((item) => ({ start: item.occupiedStartsAt, end: item.occupiedEndsAt })),
      ],
    }))
    const policy = facts.location.business.Policy
    const dates = summarizeAvailableDates({
      dates: dateWindows(input.from, input.to, timezone),
      now: new Date(), minimumNoticeMinutes: policy?.minimumNoticeMinutes ?? 60,
      maximumAdvanceBookingDays: policy?.maximumAdvanceBookingDays ?? 90,
      services: input.offeringIds.map((offeringId, index) => {
        const offering = facts.offerings.find((candidate) => candidate.id === offeringId)!
        return { offeringId, durationMinutes: offering.durationMinutes, preparationMinutes: offering.preparationMinutes, cleanupMinutes: offering.cleanupMinutes, attendeeCount: input.attendeeCounts[index]!, capacity: offering.capacity }
      }),
      professionals,
      locationHours: recurringIntervalsForRange(facts.location.Hours, broadStart, broadEnd, timezone),
    })
    return NextResponse.json({ dates, timezone })
  } catch {
    return NextResponse.json({ code: 'INVALID_SELECTION', message: 'Available dates could not be calculated.' }, { status: 422 })
  }
}
