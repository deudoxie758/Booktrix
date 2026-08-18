import { NextResponse } from 'next/server'

import { parseBookingHoldRequest, toBookingHoldErrorResponse } from '@/modules/scheduling/hold-api'
import { createBookingHold, prismaHoldStore } from '@/modules/scheduling/holds'
import { loadSchedulingFacts, toSchedulingSnapshot } from '@/modules/scheduling/repository'
import { deriveValidatedSegments } from '@/modules/scheduling/validation'

export async function POST(request: Request) {
  try {
    const parsed = parseBookingHoldRequest(await request.json())
    const starts = parsed.segments.map((segment) => segment.start.getTime())
    const facts = await loadSchedulingFacts({
      businessId: parsed.businessId,
      locationId: parsed.locationId,
      offeringIds: parsed.segments.map((segment) => segment.offeringId),
      rangeStart: new Date(Math.min(...starts) - 86_400_000),
      rangeEnd: new Date(Math.max(...starts) + 86_400_000),
    })
    const segments = deriveValidatedSegments({
      businessId: parsed.businessId!,
      locationId: parsed.locationId!,
      segments: parsed.segments!.map((segment) => ({
        offeringId: segment.offeringId!,
        membershipId: segment.membershipId!,
        start: segment.start!,
        attendeeCount: segment.attendeeCount!,
      })),
    }, toSchedulingSnapshot(facts))
    const hold = await createBookingHold({ businessId: parsed.businessId, customerId: parsed.customerId, checkoutIdentity: parsed.checkoutIdentity, idempotencyKey: parsed.idempotencyKey, segments }, { store: prismaHoldStore })
    return NextResponse.json({ token: hold.token, expiresAt: hold.expiresAt }, { status: 201 })
  } catch (error) {
    const response = toBookingHoldErrorResponse(error as { code?: string })
    return NextResponse.json(response.body, { status: response.status })
  }
}
