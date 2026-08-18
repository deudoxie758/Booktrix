import Link from 'next/link'
import { MarketplaceHero } from '@/components/marketplace/MarketplaceHero'
import { Card } from '@/components/ui/Card'
import { StorefrontCard } from '@/components/marketplace/StorefrontCard'
import { searchMarketplace } from '@/modules/marketplace/search'

export const dynamic = 'force-dynamic'

const categories = ['Hair & grooming', 'Nails & beauty', 'Wellness', 'Professional services', 'Classes & experiences', 'Home services']

export default async function HomePage() {
	const businesses = await searchMarketplace({ take: 6 }).catch(() => [])

	return <>
		<MarketplaceHero />
		<section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
			<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-clay-600">Explore your way</p><h2 className="mt-3 font-display text-4xl text-cocoa-950">What can we book for you?</h2></div><Link href="/search" className="text-sm font-semibold text-cocoa-800 underline decoration-clay-400 underline-offset-4">View all services</Link></div>
			<div className="mt-9 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">{categories.map((category) => <Link key={category} href={`/search?q=${encodeURIComponent(category)}`} className="rounded-2xl border border-sand-200 bg-white px-4 py-6 text-sm font-semibold text-cocoa-900 shadow-sm transition hover:-translate-y-1 hover:shadow-soft">{category}</Link>)}</div>
		</section>
		<section className="bg-white px-5 py-16 sm:px-8 sm:py-24"><div className="mx-auto max-w-7xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-clay-600">Curated locally</p><h2 className="mt-3 font-display text-4xl text-cocoa-950">Booktrix businesses</h2>
			{businesses.length ? <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{businesses.map((business) => <StorefrontCard key={business.businessSlug} result={business} />)}</div> : <Card className="mt-9 p-8 text-center"><h3 className="font-display text-2xl text-cocoa-950">New storefronts are being prepared.</h3><p className="mx-auto mt-2 max-w-xl text-cocoa-600">Approved businesses will appear here as soon as their Booktrix profiles are ready to welcome bookings.</p></Card>}
		</div></section>
	</>
}
