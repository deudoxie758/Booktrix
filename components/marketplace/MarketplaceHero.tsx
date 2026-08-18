import Link from 'next/link'

export function MarketplaceHero() {
	return <section className="relative overflow-hidden bg-cream-100 px-5 py-16 sm:px-8 sm:py-24 lg:py-28">
		<div className="absolute -right-24 -top-28 h-96 w-96 rounded-full bg-clay-200/60 blur-3xl" />
		<div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
			<div><p className="mb-5 text-xs font-bold uppercase tracking-[.22em] text-clay-600">Made for Saint Lucia</p><h1 className="max-w-3xl font-display text-5xl leading-[.98] tracking-tight text-cocoa-950 sm:text-6xl lg:text-7xl">Book your next <em className="font-normal text-clay-600">feel-good moment.</em></h1><p className="mt-7 max-w-xl text-lg leading-8 text-cocoa-600">Discover trusted local professionals, compare services, and reserve a time that works beautifully for you.</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/search" className="rounded-full bg-cocoa-900 px-7 py-3.5 text-sm font-semibold text-white shadow-soft">Explore services</Link><Link href="/for-business" className="rounded-full border border-sand-300 bg-white/70 px-7 py-3.5 text-sm font-semibold text-cocoa-900">List your business</Link></div></div>
			<div aria-hidden="true" className="relative mx-auto aspect-[4/4.6] w-full max-w-md rounded-[9rem_9rem_2rem_2rem] bg-gradient-to-br from-clay-200 via-clay-400 to-cocoa-700 p-5 shadow-soft"><div className="flex h-full items-end rounded-[8rem_8rem_1.25rem_1.25rem] border border-white/30 bg-[radial-gradient(circle_at_50%_25%,rgba(255,255,255,.55),transparent_32%),linear-gradient(150deg,rgba(255,255,255,.2),rgba(37,29,26,.22))] p-7 text-white"><div><p className="text-xs font-bold uppercase tracking-[.2em]">Local favourites</p><p className="mt-2 font-display text-3xl">Care, close to home.</p></div></div></div>
		</div>
	</section>
}
