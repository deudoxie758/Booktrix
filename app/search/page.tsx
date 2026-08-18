import Link from 'next/link'

import { SearchFilters } from '@/components/marketplace/SearchFilters'
import { StorefrontCard } from '@/components/marketplace/StorefrontCard'
import { searchMarketplace } from '@/modules/marketplace/search'

export const dynamic = 'force-dynamic'

const categories = ['Beauty', 'Hair & grooming', 'Home services', 'Professional services', 'Wellness']

export default async function SearchPage({ searchParams }: { searchParams: { q?: string; category?: string; district?: string } }) {
  const results = await searchMarketplace({ query: searchParams.q, category: searchParams.category, district: searchParams.district }).catch(() => [])
  return <main className="min-h-screen bg-cream-100">
    <section className="border-b border-sand-200 bg-white px-5 py-12 sm:px-8 sm:py-16"><div className="mx-auto max-w-7xl"><Link href="/" className="text-sm font-semibold text-clay-600">← Back to Booktrix</Link><p className="mt-8 text-xs font-bold uppercase tracking-[.2em] text-clay-600">Discover Saint Lucia</p><h1 className="mt-3 max-w-3xl font-display text-5xl leading-tight text-cocoa-950 sm:text-6xl">Find care and expertise, close to home.</h1><div className="mt-9"><SearchFilters values={searchParams} categories={categories} /></div></div></section>
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16"><div className="flex items-end justify-between"><div><p className="text-sm font-semibold text-cocoa-600" aria-live="polite">{results.length} {results.length === 1 ? 'storefront' : 'storefronts'} found</p><h2 className="mt-2 font-display text-3xl text-cocoa-950">Available to book</h2></div></div>{results.length ? <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{results.map((result) => <StorefrontCard key={result.businessSlug} result={result} />)}</div> : <div className="mt-8 rounded-3xl border border-sand-200 bg-white p-10 text-center"><h2 className="font-display text-3xl text-cocoa-950">No matches just yet.</h2><p className="mt-2 text-cocoa-600">Try a broader service or another Saint Lucian location.</p></div>}</section>
  </main>
}
