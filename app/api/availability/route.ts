import { NextResponse } from 'next/server'
import { z } from 'zod'

import { findAvailableStarts } from '@/modules/scheduling/availability'
import { loadSchedulingFacts } from '@/modules/scheduling/repository'
import { recurringIntervalsForRange } from '@/modules/scheduling/validation'

const querySchema = z.object({
  businessId: z.string().min(1),
  locationId: z.string().min(1),
  offeringIds: z.string().transform((value) => value.split(',').filter(Boolean)).pipe(z.array(z.string()).min(1)),
  attendeeCounts: z.string().transform((value) => value.split(',').map(Number)).pipe(z.array(z.number().int().min(1)).min(1)),
  from: z.coerce.date(),
  to: z.coerce.date(),
})

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!parsed.success || parsed.data.offeringIds.length !== parsed.data.attendeeCounts.length) {
    return NextResponse.json({ code: 'INVALID_SELECTION', message: 'Check the selected services and date.' }, { status: 422 })
  }
  const input = parsed.data
  if (input.from >= input.to || input.to.getTime() - input.from.getTime() > 31 * 86_400_000) {
    return NextResponse.json({ code: 'INVALID_SELECTION', message: 'Choose a valid date range.' }, { status: 422 })
  }
  try {
    const facts = await loadSchedulingFacts({ businessId: input.businessId, locationId: input.locationId, offeringIds: input.offeringIds, rangeStart: input.from, rangeEnd: input.to })
    if (facts.offerings.length !== input.offeringIds.length) {
      return NextResponse.json({ code: 'INVALID_SELECTION', message: 'One or more services are unavailable.' }, { status: 422 })
    }
    const professionals = Array.from(new Set(facts.qualifications.map((item) => item.membershipId))).sort().map((membershipId) => ({
      membershipId,
      qualifiedOfferingIds: facts.qualifications.filter((item) => item.membershipId === membershipId).map((item) => item.offeringId),
      working: recurringIntervalsForRange(facts.schedules.filter((item) => item.membershipId === membershipId), input.from, input.to, facts.location.timezone),
      timeOff: facts.timeOff.filter((item) => item.membershipId === membershipId).map((item) => ({ start: item.startsAt, end: item.endsAt })),
      occupied: [
        ...facts.segments.filter((item) => item.membershipId === membershipId).map((item) => ({ start: item.occupiedStartsAt, end: item.occupiedEndsAt })),
        ...facts.holds.filter((item) => item.membershipId === membershipId).map((item) => ({ start: item.occupiedStartsAt, end: item.occupiedEndsAt })),
      ],
    }))
    const starts = findAvailableStarts({
      window: { start: input.from, end: input.to },
      locationHours: recurringIntervalsForRange(facts.location.Hours, input.from, input.to, facts.location.timezone),
      services: input.offeringIds.map((offeringId, index) => {
        const offering = facts.offerings.find((item) => item.id === offeringId)!
        return { offeringId, durationMinutes: offering.durationMinutes, preparationMinutes: offering.preparationMinutes, cleanupMinutes: offering.cleanupMinutes, attendeeCount: input.attendeeCounts[index]!, capacity: offering.capacity }
      }),
      professionals,
    })
    return NextResponse.json({ slots: starts })
  } catch {
    return NextResponse.json({ code: 'INVALID_SELECTION', message: 'Availability could not be calculated.' }, { status: 422 })
  }
}
