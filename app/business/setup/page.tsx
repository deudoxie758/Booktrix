import { requireActor } from '@/modules/identity/session'
import { resolveBusinessContext } from '@/modules/organizations/context'
import { isBusinessSetupReady } from '@/modules/organizations/lifecycle'
import { publishBusinessAction, updateSetupAction } from './actions'

export default async function SetupPage() {
	const actor = await requireActor()
	const { business, membership } = await resolveBusinessContext(actor.id)
	if (membership.role !== 'OWNER') return <p>Only a business owner can complete company setup.</p>
	const setup = business.Setup!
	const steps = [['profileComplete','Business profile',setup.profileComplete],['firstLocationComplete','First location',setup.firstLocationComplete],['policiesAccepted','Policies accepted',setup.policiesAccepted],['publicationReady','Storefront reviewed',setup.publicationReady]] as const
	return <div><h2 className="font-display text-3xl">Setup checklist</h2><div className="mt-6 space-y-3">{steps.map(([step,label,complete]) => <div key={step} className="flex items-center justify-between rounded-2xl bg-white p-5"><span className="font-semibold">{label}</span>{complete ? <span className="text-sm font-semibold text-emerald-700">Complete</span> : <form action={updateSetupAction}><input type="hidden" name="businessId" value={business.id}/><input type="hidden" name="step" value={step}/><button className="rounded-full bg-clay-100 px-4 py-2 text-sm font-semibold">Mark complete</button></form>}</div>)}</div>{isBusinessSetupReady(setup) ? <form action={publishBusinessAction} className="mt-7"><input type="hidden" name="businessId" value={business.id}/><button className="rounded-full bg-cocoa-900 px-6 py-3 font-semibold text-white">Publish business</button></form> : null}</div>
}
