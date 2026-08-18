import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { requireActor } from '@/modules/identity/session'
import { resolveBusinessContext } from '@/modules/organizations/context'

export default async function BusinessHome() {
	const actor = await requireActor()
	const { business, membership, availableLocations } = await resolveBusinessContext(actor.id)
	return <div className="grid gap-5 md:grid-cols-3"><Card className="p-6 md:col-span-2"><p className="text-sm text-cocoa-600">Business status</p><h2 className="mt-2 font-display text-3xl">{business.status.replace('_',' ')}</h2><p className="mt-3 text-cocoa-600">{business.status === 'SETUP' ? 'Complete the setup checklist before publishing your storefront.' : 'Your Booktrix business workspace is ready.'}</p>{business.status === 'SETUP' ? <Link href="/business/setup" className="mt-6 inline-flex rounded-full bg-cocoa-900 px-5 py-3 text-sm font-semibold text-white">Continue setup</Link> : null}</Card><Card className="p-6"><p className="text-sm text-cocoa-600">Your access</p><p className="mt-2 text-2xl font-semibold capitalize">{membership.role.toLowerCase()}</p><p className="mt-2 text-sm text-cocoa-600">{availableLocations.length} authorized location{availableLocations.length === 1 ? '' : 's'}</p></Card></div>
}
