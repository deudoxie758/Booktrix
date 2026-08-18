import { NextResponse } from 'next/server'

import { parseBookingHoldRequest, toBookingHoldErrorResponse } from '@/modules/scheduling/hold-api'
import { createBookingHold, prismaHoldStore } from '@/modules/scheduling/holds'

export async function POST(request: Request) {
  try {
    const parsed = parseBookingHoldRequest(await request.json())
    const segments = parsed.segments!.map((segment) => ({
        offeringId: segment.offeringId!,
        membershipId: segment.membershipId!,
        start: segment.start!,
        attendeeCount: segment.attendeeCount!,
      }))
    const hold = await createBookingHold({ businessId: parsed.businessId!, locationId: parsed.locationId!, customerId: parsed.customerId, checkoutIdentity: parsed.checkoutIdentity!, idempotencyKey: parsed.idempotencyKey!, segments }, { store: prismaHoldStore })
    return NextResponse.json({ token: hold.token, expiresAt: hold.expiresAt }, { status: 201 })
  } catch (error) {
    const response = toBookingHoldErrorResponse(error as { code?: string })
    return NextResponse.json(response.body, { status: response.status })
  }
}
