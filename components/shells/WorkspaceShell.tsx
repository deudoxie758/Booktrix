import type { BusinessRole } from '@prisma/client'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { getWorkspaceNavigation } from './navigation'

export function WorkspaceShell({ title, role, children }: { title: string; role: BusinessRole; children: ReactNode }) {
	const navigation = getWorkspaceNavigation(role)
	return <div className="min-h-screen bg-cream-100 lg:grid lg:grid-cols-[17rem_1fr]">
		<aside className="border-b border-sand-200 bg-cocoa-950 p-5 text-cream-50 lg:min-h-screen lg:border-b-0">
			<div className="flex items-center justify-between lg:block">
				<Link href="/" className="font-display text-2xl font-semibold">booktrix<span className="text-clay-400">.</span></Link>
				<span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">{role.toLowerCase()}</span>
			</div>
			<nav aria-label="Business workspace" className="mt-6 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
				{navigation.map((item) => <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-xl px-3 py-2.5 text-sm text-cream-100 hover:bg-white/10 hover:text-white">{item.label}</Link>)}
			</nav>
		</aside>
		<main className="min-w-0 px-5 py-8 sm:px-8 lg:px-12">
			<div className="mx-auto max-w-6xl"><p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-clay-600">Business workspace</p><h1 className="font-display text-3xl text-cocoa-950 sm:text-4xl">{title}</h1><div className="mt-8">{children}</div></div>
		</main>
	</div>
}
