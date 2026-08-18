import { redirect } from 'next/navigation'
import { requireActor } from '@/modules/identity/session'
import { resolveBusinessContext } from '@/modules/organizations/context'
import { legacyManagerDestination } from '@/modules/organizations/legacy-routing'

export default async function LegacyManagerPage() {
	const actor = await requireActor()
	const context = await resolveBusinessContext(actor.id).catch(() => null)
	redirect(legacyManagerDestination(Boolean(context)))
}
