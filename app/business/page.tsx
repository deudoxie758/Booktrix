import { WorkspaceOverview } from '@/components/business/WorkspaceOverview'
import { requireActor } from '@/modules/identity/session'
import { loadBusinessOverview } from '@/modules/dashboard/business-overview'

export default async function BusinessHome() {
	const actor = await requireActor()
	const overview = await loadBusinessOverview({ actorId: actor.id, now: new Date() })
	return <WorkspaceOverview overview={overview} />
}
