import type { ReactNode } from 'react'

export function AuthShell({ eyebrow, title, description, asideTitle, asideDescription, children }: {
	eyebrow: string
	title: string
	description: string
	asideTitle: string
	asideDescription: string
	children: ReactNode
}) {
	return <section aria-labelledby="auth-heading" className="relative overflow-hidden bg-cream-100 px-5 py-10 sm:px-8 sm:py-16">
		<div aria-hidden="true" className="absolute -left-28 top-20 h-72 w-72 rounded-full bg-clay-100/70 blur-3xl" />
		<div aria-hidden="true" className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-sand-200/70 blur-3xl" />
		<div className="relative mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] border border-sand-200 bg-cream-50 shadow-soft lg:grid-cols-[.9fr_1.1fr]">
			<div className="relative hidden min-h-[42rem] overflow-hidden bg-cocoa-950 p-10 text-cream-50 lg:flex lg:flex-col lg:justify-between">
				<div aria-hidden="true" className="absolute -right-20 -top-16 h-64 w-64 rounded-full border-[3rem] border-clay-500/25" />
				<p className="relative font-display text-3xl font-semibold">booktrix<span className="text-clay-400">.</span></p>
				<div className="relative max-w-sm">
					<p className="text-xs font-bold uppercase tracking-[.2em] text-sand-200">Services, thoughtfully booked</p>
					<h2 className="mt-4 font-display text-5xl leading-[1.05]">{asideTitle}</h2>
					<p className="mt-5 text-base leading-7 text-cream-100/70">{asideDescription}</p>
				</div>
				<p className="relative text-sm text-cream-100/55">Built for Saint Lucia’s service community.</p>
			</div>
			<div className="px-6 py-9 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
				<p className="text-xs font-bold uppercase tracking-[.2em] text-clay-600">{eyebrow}</p>
				<h1 id="auth-heading" className="mt-3 font-display text-4xl leading-tight text-cocoa-950 sm:text-5xl">{title}</h1>
				<p className="mt-4 max-w-lg text-base leading-7 text-cocoa-600">{description}</p>
				<div className="mt-8">{children}</div>
			</div>
		</div>
	</section>
}
