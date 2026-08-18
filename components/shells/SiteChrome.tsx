'use client'

import { usePathname } from 'next/navigation'
import { PublicHeader } from './PublicHeader'

export function SiteChrome({ signedIn }: { signedIn: boolean }) {
	const pathname = usePathname()
	if (pathname.startsWith('/business') || pathname.startsWith('/admin')) return null
	return <PublicHeader signedIn={signedIn} />
}
