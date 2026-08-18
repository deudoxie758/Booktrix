import { prisma } from '@/lib/prisma'

export async function loadSchedulingFacts(input: {
  businessId: string
  locationId: string
  offeringIds: string[]
  rangeStart: Date
  rangeEnd: Date
}) {
  const [location, offerings, qualifications, schedules, timeOff, segments, holds] = await Promise.all([
    prisma.location.findFirstOrThrow({ where: { id: input.locationId, businessId: input.businessId, isActive: true }, include: { Hours: true } }),
    prisma.serviceOffering.findMany({ where: { id: { in: input.offeringIds }, businessId: input.businessId, active: true, Locations: { some: { locationId: input.locationId, active: true } } } }),
    prisma.staffQualification.findMany({ where: { offeringId: { in: input.offeringIds }, locationId: input.locationId, active: true, membership: { active: true } } }),
    prisma.staffSchedule.findMany({ where: { locationId: input.locationId } }),
    prisma.staffTimeOff.findMany({ where: { locationId: input.locationId, startsAt: { lt: input.rangeEnd }, endsAt: { gt: input.rangeStart } } }),
    prisma.bookingSegment.findMany({ where: { locationId: input.locationId, occupiedStartsAt: { lt: input.rangeEnd }, occupiedEndsAt: { gt: input.rangeStart }, status: { in: ['REQUESTED', 'CONFIRMED', 'IN_PROGRESS'] } } }),
    prisma.bookingHoldSegment.findMany({ where: { locationId: input.locationId, occupiedStartsAt: { lt: input.rangeEnd }, occupiedEndsAt: { gt: input.rangeStart }, hold: { expiresAt: { gt: new Date() }, consumedAt: null } } }),
  ])
  return { location, offerings, qualifications, schedules, timeOff, segments, holds }
}
