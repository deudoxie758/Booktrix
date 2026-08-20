import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

import type { SchedulingSnapshot } from './validation'

type SchedulingClient = typeof prisma | Prisma.TransactionClient

export async function loadSchedulingFacts(input: {
  businessId: string
  locationId: string
  offeringIds: string[]
  membershipIds?: string[]
  rangeStart: Date
  rangeEnd: Date
  excludeHoldToken?: string
}, client: SchedulingClient = prisma, now = new Date()) {
  const [location, offerings, qualifications, schedules, timeOff, segments, holds] = await Promise.all([
    client.location.findFirstOrThrow({ where: { id: input.locationId, businessId: input.businessId, isActive: true }, include: { Hours: true, business: { select: { status: true } } } }),
    client.serviceOffering.findMany({ where: { id: { in: input.offeringIds }, businessId: input.businessId, active: true, Locations: { some: { locationId: input.locationId, active: true, location: { businessId: input.businessId, isActive: true } } } } }),
    client.staffQualification.findMany({
      where: {
        offeringId: { in: input.offeringIds }, locationId: input.locationId, active: true,
        offering: { businessId: input.businessId, active: true },
        location: { businessId: input.businessId, isActive: true },
        membership: { businessId: input.businessId, active: true, Locations: { some: { locationId: input.locationId } } },
      },
      include: { membership: { include: { Locations: { select: { locationId: true } } } } },
    }),
    client.staffSchedule.findMany({ where: { locationId: input.locationId, membership: { businessId: input.businessId, active: true, Locations: { some: { locationId: input.locationId } } } } }),
    client.staffTimeOff.findMany({ where: { locationId: input.locationId, membership: { businessId: input.businessId }, startsAt: { lt: input.rangeEnd }, endsAt: { gt: input.rangeStart } } }),
    client.bookingSegment.findMany({ where: { membershipId: { in: input.membershipIds }, order: { businessId: input.businessId }, occupiedStartsAt: { lt: input.rangeEnd }, occupiedEndsAt: { gt: input.rangeStart }, status: { in: ['REQUESTED', 'CONFIRMED', 'IN_PROGRESS'] } } }),
    client.bookingHoldSegment.findMany({ where: { membershipId: { in: input.membershipIds }, occupiedStartsAt: { lt: input.rangeEnd }, occupiedEndsAt: { gt: input.rangeStart }, hold: { businessId: input.businessId, expiresAt: { gt: now }, consumedAt: null, token: input.excludeHoldToken ? { not: input.excludeHoldToken } : undefined } } }),
  ])
  return { location, offerings, qualifications, schedules, timeOff, segments, holds }
}

export function toSchedulingSnapshot(facts: Awaited<ReturnType<typeof loadSchedulingFacts>>): SchedulingSnapshot {
  const membershipIds = Array.from(new Set(facts.qualifications.map((item) => item.membershipId)))
  return {
    businessId: facts.location.businessId,
    businessPublished: facts.location.business.status === 'PUBLISHED',
    location: {
      id: facts.location.id,
      businessId: facts.location.businessId,
      active: facts.location.isActive,
      timezone: facts.location.timezone,
      hours: facts.location.Hours,
    },
    offerings: facts.offerings.map((offering) => ({
      id: offering.id,
      businessId: offering.businessId,
      active: offering.active,
      durationMinutes: offering.durationMinutes,
      preparationMinutes: offering.preparationMinutes,
      cleanupMinutes: offering.cleanupMinutes,
      capacity: offering.capacity,
      priceCents: offering.priceCents,
    })),
    professionals: membershipIds.map((membershipId) => {
      const qualification = facts.qualifications.find((item) => item.membershipId === membershipId)!
      return {
        membershipId,
        businessId: qualification.membership.businessId,
        active: qualification.membership.active,
        assignedLocationIds: qualification.membership.Locations.map((item) => item.locationId),
        qualifiedOfferingIds: facts.qualifications.filter((item) => item.membershipId === membershipId).map((item) => item.offeringId),
        schedules: facts.schedules.filter((item) => item.membershipId === membershipId),
        timeOff: facts.timeOff.filter((item) => item.membershipId === membershipId).map((item) => ({ start: item.startsAt, end: item.endsAt })),
      }
    }),
    occupied: [...facts.segments, ...facts.holds].map((item) => ({
      membershipId: item.membershipId!,
      start: item.occupiedStartsAt,
      end: item.occupiedEndsAt,
      attendeeCount: item.attendeeCount,
    })),
  }
}
