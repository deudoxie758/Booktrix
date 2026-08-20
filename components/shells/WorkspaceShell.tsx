import type { BusinessRole } from '@prisma/client'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { getWorkspaceNavigation } from './navigation'
import { WorkspaceDesktopNavigation, WorkspaceMobileNavigation } from './WorkspaceMobileNavigation'

export function WorkspaceShell({ title, role, activeLocationName, identityName, children }: { title: string; role: BusinessRole; activeLocationName?: string | null; identityName?: string | null; children: ReactNode }) {
	const navigation = getWorkspaceNavigation(role)
	return <div className="min-h-screen bg-cream-100 lg:grid lg:grid-cols-[17rem_1fr]">
		<aside className="border-b border-sand-200 bg-cocoa-950 p-5 text-cream-50 lg:min-h-screen lg:border-b-0">
			<div className="flex items-center justify-between lg:block">
				<Link href="/business" className="font-display text-2xl font-semibold">booktrix<span className="text-clay-400">.</span></Link>
				<div className="lg:hidden"><WorkspaceMobileNavigation navigation={navigation} role={role} /></div>
			</div>
			<div className="hidden lg:block"><WorkspaceDesktopNavigation navigation={navigation} role={role} /></div>
		</aside>
		<main className="min-w-0 px-5 py-8 sm:px-8 lg:px-12">
			<div className="mx-auto max-w-6xl"><p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-clay-600">Business workspace</p><h1 className="font-display text-3xl text-cocoa-950 sm:text-4xl">{title}</h1>{activeLocationName ? <p className="mt-2 text-sm text-cocoa-600">Active location: {activeLocationName}</p> : null}{identityName ? <p className="mt-1 text-sm text-cocoa-600">Signed in as {identityName}</p> : null}<div className="mt-8">{children}</div></div>
		</main>
	</div>
}
