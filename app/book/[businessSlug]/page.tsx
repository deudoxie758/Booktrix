import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { prisma } from '@/lib/prisma'
import { getPublishedStorefront } from '@/modules/marketplace/storefront'

import { BookingFlow } from './BookingFlow'

export const dynamic = 'force-dynamic'

export default async function BookingPage({ params, searchParams }: { params: { businessSlug: string }; searchParams: { services?: string; hold?: string } }) {
  const business = await getPublishedStorefront(params.businessSlug)
  if (!business) notFound()
  const selectedIds = (searchParams.services ?? '').split(',').filter(Boolean)
  const validIds = business.ServiceOfferings.filter((offering) => selectedIds.includes(offering.id)).map((offering) => offering.id)
  let hold: null | { token: string; expiresAt: string; expired: boolean } = null
  if (searchParams.hold) {
    const persisted = await prisma.bookingHold.findFirst({ where: { token: searchParams.hold, businessId: business.id } })
    if (persisted) {
      hold = { token: persisted.token, expiresAt: persisted.expiresAt.toISOString(), expired: Boolean(persisted.consumedAt) || persisted.expiresAt <= new Date() }
    }
  }
  if (!validIds.length && !hold) redirect(`/s/${business.slug}`)
  const selected = validIds.length ? validIds : business.ServiceOfferings.map((offering) => offering.id)
  return <main className="min-h-screen bg-cream-100 px-5 py-8 sm:px-8 sm:py-12"><div className="mx-auto max-w-7xl"><Link href={`/s/${business.slug}`} className="text-sm font-semibold text-clay-600">← Back to {business.name}</Link><header className="mb-8 mt-7"><p className="text-xs font-bold uppercase tracking-[.18em] text-clay-600">Secure booking</p><h1 className="mt-3 font-display text-4xl text-cocoa-950 sm:text-5xl">Plan your visit to {business.name}</h1></header><BookingFlow initialState={{ businessId: business.id, businessSlug: business.slug, businessName: business.name, locations: business.Locations.map((location) => ({ id: location.id, name: location.name })), offerings: business.ServiceOfferings.map((offering) => ({ id: offering.id, name: offering.name, durationMinutes: offering.durationMinutes, priceCents: offering.priceCents, currency: offering.currency, paymentChoices: [
    ...(offering.allowFullPayment ? ['FULL' as const] : []),
    ...(offering.allowDeposit ? ['DEPOSIT' as const] : []),
    ...(offering.allowCash ? ['CASH' as const] : []),
  ] })), selectedOfferingIds: selected, hold }} /></div></main>
}
