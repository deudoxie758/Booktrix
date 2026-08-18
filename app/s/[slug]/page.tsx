import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ServicePicker } from '@/components/marketplace/ServicePicker'
import { getPublishedStorefront } from '@/modules/marketplace/storefront'

export const dynamic = 'force-dynamic'

export default async function StorefrontPage({ params }: { params: { slug: string } }) {
  const business = await getPublishedStorefront(params.slug)
  if (!business) notFound()
  const professionals = new Map<string, string>()
  business.ServiceOfferings.forEach((offering) => offering.Qualifications.forEach((qualification) => professionals.set(qualification.membershipId, qualification.membership.user.name ?? 'Booktrix professional')))
  return <main className="min-h-screen bg-cream-100">
    <section className="relative overflow-hidden bg-cocoa-950 px-5 py-16 text-white sm:px-8 sm:py-24"><div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-clay-500/30 blur-3xl" /><div className="relative mx-auto max-w-7xl"><Link href="/search" className="text-sm font-semibold text-clay-200">← Explore storefronts</Link><p className="mt-10 text-xs font-bold uppercase tracking-[.2em] text-clay-300">Published Booktrix business</p><h1 className="mt-3 max-w-4xl font-display text-5xl leading-none sm:text-7xl">{business.name}</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-sand-200">Choose one service or build a care sequence that fits your day.</p></div></section>
    <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[.7fr_1.3fr] lg:py-16"><aside className="space-y-5"><section className="rounded-3xl border border-sand-200 bg-white p-6 shadow-soft"><p className="text-xs font-bold uppercase tracking-[.16em] text-clay-600">Locations</p>{business.Locations.map((location) => <div key={location.id} className="mt-4"><h2 className="font-display text-xl text-cocoa-950">{location.name}</h2><p className="mt-1 text-sm text-cocoa-600">{location.address ?? 'Saint Lucia'}</p>{location.phone && <a href={`tel:${location.phone}`} className="mt-2 block text-sm font-semibold text-clay-600">{location.phone}</a>}</div>)}</section><section className="rounded-3xl border border-sand-200 bg-white p-6 shadow-soft"><p className="text-xs font-bold uppercase tracking-[.16em] text-clay-600">Professionals</p><p className="mt-3 text-sm leading-6 text-cocoa-600">Choose a professional during booking, or let Booktrix find anyone available.</p><ul className="mt-4 space-y-2 text-sm font-semibold text-cocoa-800">{Array.from(professionals.entries()).map(([id, name]) => <li key={id}>{name}</li>)}</ul></section></aside><section><p className="text-xs font-bold uppercase tracking-[.16em] text-clay-600">Services</p><h2 className="mt-3 font-display text-4xl text-cocoa-950">What would you like to book?</h2><p className="mt-3 text-cocoa-600">Select multiple services to reserve them in one checkout.</p><div className="mt-8"><ServicePicker businessSlug={business.slug} offerings={business.ServiceOfferings.map((offering) => ({ id: offering.id, name: offering.name, description: offering.description, durationMinutes: offering.durationMinutes, priceCents: offering.priceCents, currency: offering.currency }))} /></div></section></div>
  </main>
}
