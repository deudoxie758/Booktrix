import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { parseBookingHoldRequest, toBookingHoldErrorResponse } from '@/modules/scheduling/hold-api'
import { createBookingHold, prismaHoldStore } from '@/modules/scheduling/holds'

export async function POST(request: Request) {
  try {
    const parsed = parseBookingHoldRequest(await request.json())
    const offerings = await prisma.serviceOffering.findMany({
      where: { id: { in: parsed.segments.map((segment) => segment.offeringId) }, businessId: parsed.businessId, active: true, business: { status: 'PUBLISHED' }, Locations: { some: { locationId: parsed.locationId, active: true, location: { isActive: true } } } },
      include: { Qualifications: { where: { locationId: parsed.locationId, active: true } } },
    })
    if (offerings.length !== parsed.segments.length) throw { code: 'INVALID_SELECTION' }
    const segments = parsed.segments.map((segment) => {
      const offering = offerings.find((item) => item.id === segment.offeringId)!
      if (!offering.Qualifications.some((item) => item.membershipId === segment.membershipId)) throw { code: 'INVALID_SELECTION' }
      return {
        offeringId: segment.offeringId!,
        locationId: segment.locationId!,
        membershipId: segment.membershipId!,
        start: segment.start!,
        end: segment.end!,
        occupiedStart: segment.occupiedStart!,
        occupiedEnd: segment.occupiedEnd!,
        attendeeCount: segment.attendeeCount!,
        capacity: offering.capacity,
        priceCents: offering.priceCents * segment.attendeeCount!,
      }
    })
    const hold = await createBookingHold({ businessId: parsed.businessId, customerId: parsed.customerId, checkoutIdentity: parsed.checkoutIdentity, idempotencyKey: parsed.idempotencyKey, segments }, { store: prismaHoldStore })
    return NextResponse.json({ token: hold.token, expiresAt: hold.expiresAt }, { status: 201 })
  } catch (error) {
    const response = toBookingHoldErrorResponse(error as { code?: string })
    return NextResponse.json(response.body, { status: response.status })
  }
}
