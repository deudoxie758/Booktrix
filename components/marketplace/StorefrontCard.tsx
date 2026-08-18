import Link from 'next/link'

import type { MarketplaceResult } from '@/modules/marketplace/search'

export function StorefrontCard({ result }: { result: MarketplaceResult }) {
  return <article className="overflow-hidden rounded-3xl border border-sand-200 bg-white shadow-soft">
    <div className="h-36 bg-gradient-to-br from-sand-100 via-clay-100 to-clay-300" />
    <div className="p-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-clay-600">{result.offerings[0]?.category}</p><h2 className="mt-2 font-display text-3xl text-cocoa-950">{result.businessName}</h2><p className="mt-2 text-sm text-cocoa-600">{result.locations.map((location) => location.address || location.name).join(' · ')}</p><div className="mt-5 flex items-end justify-between gap-4"><p className="text-sm text-cocoa-700">From <strong>${(result.startingPriceCents / 100).toFixed(2)} XCD</strong></p><Link href={`/s/${result.businessSlug}`} className="rounded-full bg-cocoa-900 px-5 py-2.5 text-sm font-semibold text-white">View services</Link></div></div>
  </article>
}
