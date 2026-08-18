import { redirect } from 'next/navigation'
import { getActor } from '@/modules/identity/session'
import { BusinessApplicationForm } from './BusinessApplicationForm'
import { submitApplicationAction } from './actions'

export default async function ApplyPage() {
	const actor = await getActor()
	if (!actor) redirect('/auth/sign-in?callbackUrl=/for-business/apply')
	return <main className="px-5 py-16 sm:px-8"><div className="mx-auto max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-clay-600">Business application</p><h1 className="mt-4 font-display text-5xl text-cocoa-950">Tell us about your business.</h1><p className="mt-4 text-cocoa-600">Booktrix reviews every business before it can publish. You’ll complete locations, services, and policies after approval.</p><div className="mt-10 rounded-3xl border border-sand-200 bg-white p-6 shadow-soft sm:p-9"><BusinessApplicationForm action={submitApplicationAction} /></div></div></main>
}
