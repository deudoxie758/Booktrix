import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { WorkspaceShell } from '@/components/shells/WorkspaceShell'
import { getActor } from '@/modules/identity/session'
import { resolveBusinessContext } from '@/modules/organizations/context'

export default async function BusinessLayout({ children }: { children: ReactNode }) {
	const actor = await getActor()
	if (!actor) redirect('/auth/sign-in?callbackUrl=/business')
	const context = await resolveBusinessContext(actor.id).catch(() => null)
	if (!context) redirect('/for-business')
	return <WorkspaceShell title={context.business.name} role={context.membership.role} activeLocationName={context.activeLocation?.name} identityName={actor.name}>{children}</WorkspaceShell>
}
