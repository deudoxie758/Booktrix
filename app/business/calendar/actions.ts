'use server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { createManagedBooking, manageBookingSegment } from '@/modules/bookings/management'
import { requireActor } from '@/modules/identity/session'
import { buildIntakeSubmission } from '@/modules/intake/snapshot'

export type ManagedBookingActionResult = { ok: true } | { ok: false; error: string }

function bookingErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : error instanceof Error ? error.message : ''
  if (code === 'SERVICE_NOT_AVAILABLE_AT_LOCATION') return 'That service is no longer available at this location.'
  if (code === 'INVALID_START_TIME') return 'Choose a valid appointment date and time.'
  if (code === 'INVALID_BOOKING') return 'Choose a qualified professional and complete the required customer details.'
  if (['SLOT_UNAVAILABLE', 'INVALID_SELECTION', 'INVALID_SEQUENCE'].includes(code)) return 'That time is no longer available. Choose another time.'
  return 'Unable to create this booking. Please review the details and try again.'
}

export async function createManagedBookingAction(formData: FormData): Promise<ManagedBookingActionResult> {
  try {
    const actor = await requireActor()
    const offeringId = String(formData.get('offeringId') ?? '')
    const locationId = String(formData.get('locationId') ?? '')
    const offering = await prisma.serviceOffering.findFirst({ where: { id: offeringId, Locations: { some: { locationId, active: true } } }, include: { IntakeTemplates: { include: { template: { include: { Questions: { orderBy: { sortOrder: 'asc' } } } } } } } })
    if (!offering) throw new Error('SERVICE_NOT_AVAILABLE_AT_LOCATION')
    const startsAt = new Date(String(formData.get('startsAt') ?? ''))
    if (Number.isNaN(startsAt.getTime())) throw new Error('INVALID_START_TIME')
    const walkIn = String(formData.get('customerKind')) === 'WALK_IN'
    const questions = offering.IntakeTemplates.flatMap((item) => item.template.active ? item.template.Questions.map((question) => ({ id: question.id, label: question.label, type: question.type, options: question.options, required: question.required, sensitive: question.sensitive })) : [])
    const answers = Object.fromEntries(questions.map((question) => [question.id, String(formData.get(`intake_${question.id}`) ?? '')]))
    const intake = buildIntakeSubmission({ questions, answers, sensitiveConsent: formData.get('sensitiveConsent') === 'on', secret: process.env.INTAKE_ENCRYPTION_SECRET ?? process.env.NEXTAUTH_SECRET ?? '' })
    await createManagedBooking({
      actorId: actor.id, businessId: offering.businessId, locationId,
      customer: walkIn ? { kind: 'WALK_IN', name: String(formData.get('customerName') ?? ''), email: String(formData.get('customerEmail') ?? '') || undefined, phone: String(formData.get('customerPhone') ?? '') || undefined } : { kind: 'REGISTERED', customerId: String(formData.get('customerId') ?? '') },
      segments: [{ offeringId, membershipId: String(formData.get('membershipId') ?? ''), startsAt, attendeeCount: 1 }],
      override: false, intake,
    })
    revalidatePath('/business/calendar')
    return { ok: true }
  } catch (error) {
    return { ok: false, error: bookingErrorMessage(error) }
  }
}

export async function manageBookingSegmentAction(formData: FormData) {
  await manageBookingSegment({ segmentId: String(formData.get('segmentId') ?? ''), locationId: String(formData.get('locationId') ?? ''), status: String(formData.get('status')) as any })
  revalidatePath('/business/calendar')
}
