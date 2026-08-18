'use server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { createManagedBooking, manageBookingSegment } from '@/modules/bookings/management'
import { requireActor } from '@/modules/identity/session'
export async function createManagedBookingAction(formData: FormData) {
  const actor = await requireActor(); const offeringId = String(formData.get('offeringId') ?? ''); const locationId = String(formData.get('locationId') ?? '')
  const offering = await prisma.serviceOffering.findFirst({ where: { id: offeringId, Locations: { some: { locationId, active: true } } } }); if (!offering) throw new Error('SERVICE_NOT_AVAILABLE_AT_LOCATION')
  const startsAt = new Date(String(formData.get('startsAt') ?? '')); if (Number.isNaN(startsAt.getTime())) throw new Error('INVALID_START_TIME'); const endsAt = new Date(startsAt.getTime() + offering.durationMinutes * 60_000)
  const walkIn = String(formData.get('customerKind')) === 'WALK_IN'
  await createManagedBooking({ actorId: actor.id, businessId: offering.businessId, locationId, customer: walkIn ? { kind: 'WALK_IN', name: String(formData.get('customerName') ?? ''), email: String(formData.get('customerEmail') ?? '') || undefined, phone: String(formData.get('customerPhone') ?? '') || undefined } : { kind: 'REGISTERED', customerId: String(formData.get('customerId') ?? '') }, segments: [{ offeringId, membershipId: String(formData.get('membershipId') ?? '') || undefined, startsAt, endsAt, occupiedStartsAt: new Date(startsAt.getTime() - offering.preparationMinutes * 60_000), occupiedEndsAt: new Date(endsAt.getTime() + offering.cleanupMinutes * 60_000), priceCents: offering.priceCents, confirmationMode: offering.confirmationMode }], override: false })
  revalidatePath('/business/calendar')
}
export async function manageBookingSegmentAction(formData: FormData) { await manageBookingSegment({ segmentId: String(formData.get('segmentId') ?? ''), locationId: String(formData.get('locationId') ?? ''), status: String(formData.get('status')) as any }); revalidatePath('/business/calendar') }
