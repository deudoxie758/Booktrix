import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { prisma } from '@/lib/prisma'
import { getPublishedStorefront } from '@/modules/marketplace/storefront'
import { getActor } from '@/modules/identity/session'
import { checkoutPaymentChoices, offeringCheckoutEnabled } from '@/lib/payment-mode'

import { BookingFlow } from './BookingFlow'

export const dynamic = 'force-dynamic'

export default async function BookingPage({ params, searchParams }: { params: { businessSlug: string }; searchParams: { services?: string; hold?: string; reschedule?: string } }) {
  const business = await getPublishedStorefront(params.businessSlug)
  if (!business) notFound()
  const selectedIds = (searchParams.services ?? '').split(',').filter(Boolean)
  const validIds = business.ServiceOfferings.filter((offering) => selectedIds.includes(offering.id)).map((offering) => offering.id)
  let hold: null | { token: string; expiresAt: string; expired: boolean; segments: Array<{ offeringId: string; offeringName: string; startsAt: string; endsAt: string; locationName: string; professionalName: string | null }> } = null
  let heldOfferingIds: string[] = []
  if (searchParams.hold) {
    const persisted = await prisma.bookingHold.findFirst({ where: { token: searchParams.hold, businessId: business.id }, include: { Segments: { include: { offering: true, location: true, membership: { include: { user: true } } }, orderBy: { startsAt: 'asc' } } } })
    if (persisted) {
      hold = { token: persisted.token, expiresAt: persisted.expiresAt.toISOString(), expired: Boolean(persisted.consumedAt) || persisted.expiresAt <= new Date(), segments: persisted.Segments.map((segment) => ({ offeringId: segment.offeringId, offeringName: segment.offering.name, startsAt: segment.startsAt.toISOString(), endsAt: segment.endsAt.toISOString(), locationName: segment.location.name, professionalName: segment.membership.user.name })) }
      heldOfferingIds = persisted.Segments.map((segment) => segment.offeringId)
    }
  }
  if (!validIds.length && !hold) redirect(`/s/${business.slug}`)
  const selected = heldOfferingIds.length ? heldOfferingIds : validIds
  const unavailableForStaging = selected.some((offeringId) => {
    const offering = business.ServiceOfferings.find((candidate) => candidate.id === offeringId)
    return offering ? !offeringCheckoutEnabled(offering) : false
  })
  if (unavailableForStaging) {
    return <main className="min-h-screen bg-cream-100 px-5 py-16 sm:px-8"><section className="mx-auto max-w-2xl rounded-3xl border border-sand-200 bg-cream-50 p-7 text-center sm:p-10"><p className="text-xs font-bold uppercase tracking-[.18em] text-clay-600">Cash-only staging</p><h1 className="mt-3 font-display text-4xl text-cocoa-950">This service is not available to book yet</h1><p className="mt-4 leading-7 text-cocoa-600">Online payments are not active in this preview, and this service does not accept cash at the appointment.</p><Link href={`/s/${business.slug}`} className="mt-7 inline-flex rounded-full bg-cocoa-900 px-6 py-3 text-sm font-semibold text-white">Choose another service</Link></section></main>
  }
  const actor = await getActor()
  const professionals = Array.from(new Map(business.ServiceOfferings.flatMap((offering) => offering.Qualifications.map((qualification) => [qualification.membership.id, { id: qualification.membership.id, name: qualification.membership.user.name }] as const))).values())
  return <main className="min-h-screen bg-cream-100 px-5 py-8 sm:px-8 sm:py-12"><div className="mx-auto max-w-7xl"><Link href={`/s/${business.slug}`} className="text-sm font-semibold text-clay-600">← Back to {business.name}</Link><header className="mb-8 mt-7"><p className="text-xs font-bold uppercase tracking-[.18em] text-clay-600">Secure booking</p><h1 className="mt-3 font-display text-4xl text-cocoa-950 sm:text-5xl">Plan your visit to {business.name}</h1></header><BookingFlow initialState={{ businessId: business.id, businessSlug: business.slug, businessName: business.name, locations: business.Locations.map((location) => ({ id: location.id, name: location.name })), offerings: business.ServiceOfferings.map((offering) => ({ id: offering.id, name: offering.name, durationMinutes: offering.durationMinutes, priceCents: offering.priceCents, currency: offering.currency, paymentChoices: checkoutPaymentChoices([
    ...(offering.allowFullPayment ? ['FULL' as const] : []),
    ...(offering.allowDeposit ? ['DEPOSIT' as const] : []),
    ...(offering.allowCash ? ['CASH' as const] : []),
  ]) })), professionals, selectedOfferingIds: selected, hold, authenticated: Boolean(actor), rescheduleOrderId: searchParams.reschedule }} /></div></main>
}
