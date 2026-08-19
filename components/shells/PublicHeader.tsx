import Link from 'next/link'

export function PublicHeader({ signedIn = false }: { signedIn?: boolean }) {
	return <header className="sticky top-0 z-50 border-b border-sand-200/80 bg-cream-50/90 backdrop-blur-xl">
		<div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
			<Link href="/" className="font-display text-2xl font-semibold tracking-tight text-cocoa-950">booktrix<span className="text-clay-600">.</span></Link>
			<nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm font-medium text-cocoa-700 md:flex">
				<Link href="/search" className="hover:text-cocoa-950">Discover</Link>
				<Link href="/for-business" className="hover:text-cocoa-950">For businesses</Link>
			</nav>
			<Link href={signedIn ? '/profile' : '/auth/sign-in'} className="rounded-full bg-cocoa-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cocoa-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 focus-visible:ring-offset-2">{signedIn ? 'My account' : 'Sign in'}</Link>
		</div>
	</header>
}
