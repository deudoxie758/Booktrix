import Link from 'next/link'

export default function ApplicationSuccessPage() {
	return <main className="px-5 py-24 text-center"><div className="mx-auto max-w-xl rounded-3xl border border-sand-200 bg-white p-10 shadow-soft"><p className="text-xs font-bold uppercase tracking-[.2em] text-clay-600">Application received</p><h1 className="mt-4 font-display text-4xl">We’ll review your details.</h1><p className="mt-4 text-cocoa-600">You can continue using Booktrix while the platform team reviews your business.</p><Link href="/dashboard" className="mt-7 inline-flex rounded-full bg-cocoa-900 px-6 py-3 text-sm font-semibold text-white">Go to my account</Link></div></main>
}
