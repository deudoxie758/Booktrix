'use client'

import { signOut } from 'next-auth/react'
import { useState } from 'react'

export function SignOutButton({ tone = 'header' }: { tone?: 'header' | 'account' }) {
	const [isLoading, setIsLoading] = useState(false)
	const classes = tone === 'account'
		? 'rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-400 disabled:cursor-wait disabled:opacity-65'
		: 'rounded-full border border-sand-300 bg-cream-50 px-4 py-2.5 text-sm font-semibold text-cocoa-800 transition hover:bg-sand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-65'

	return <button
		type="button"
		disabled={isLoading}
		aria-busy={isLoading}
		onClick={async () => {
			setIsLoading(true)
			try {
				await signOut({ callbackUrl: '/' })
			} catch {
				setIsLoading(false)
			}
		}}
		className={classes}
	>{isLoading ? 'Signing out…' : 'Sign out'}</button>
}
