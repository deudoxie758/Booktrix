import { PendingInvitationCard, type PendingInvitationView } from '@/components/business/PendingInvitationCard'
import { TeamInvitationForm, type TeamQualificationOption } from '@/components/business/TeamInvitationForm'
import { TeamMemberCard, type ManagedTeamMemberView } from '@/components/business/TeamMemberCard'
import { prisma } from '@/lib/prisma'
import { requireWorkspaceRole } from '@/modules/organizations/context'
import { createInvitationAction, resendInvitationAction, revokeInvitationAction, updateMemberAccessAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const context = await requireWorkspaceRole(['OWNER', 'MANAGER'])
  const managerView = context.membership.role === 'MANAGER'
  const businessId = context.business.id
  const locationIds = context.availableLocations.map(({ id }) => id)
  const [memberRows, invitationRows, offerings] = await Promise.all([
    prisma.businessMembership.findMany({
      where: { businessId, ...(managerView ? { role: 'STAFF', Locations: { none: { locationId: { notIn: locationIds } } } } : {}) },
      include: {
        user: { select: { name: true, email: true } },
        Locations: { where: { location: { businessId } }, include: { location: { select: { id: true, name: true } } } },
        Qualifications: { where: { active: true, location: { businessId }, offering: { businessId } }, include: { offering: { select: { id: true, name: true } }, location: { select: { id: true, name: true } } } },
      },
      orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
    }),
    prisma.businessInvitation.findMany({
      where: { businessId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() }, ...(managerView ? { role: 'STAFF', Locations: { none: { locationId: { notIn: locationIds } } } } : {}) },
      include: { Locations: { include: { location: { select: { id: true, name: true } } } }, Qualifications: { include: { offering: { select: { id: true, name: true } }, location: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.serviceOffering.findMany({ where: { businessId, active: true, Locations: { some: { locationId: { in: locationIds }, active: true } } }, select: { id: true, name: true, Locations: { where: { locationId: { in: locationIds }, active: true }, select: { locationId: true, location: { select: { name: true } } } } }, orderBy: { name: 'asc' } }),
  ])

  const locations = context.availableLocations.map(({ id, name }) => ({ id, name }))
  const qualificationOptions: TeamQualificationOption[] = offerings.flatMap((offering) => offering.Locations.map(({ locationId, location }) => ({ offeringId: offering.id, offeringName: offering.name, locationId, locationName: location.name })))
  const members: ManagedTeamMemberView[] = memberRows.map((member) => ({ id: member.id, name: member.user.name ?? member.user.email, email: member.user.email, role: member.role, active: member.active, locations: member.Locations.map(({ location }) => location), qualifications: member.Qualifications.map(({ offering, location }) => ({ offeringId: offering.id, offeringName: offering.name, locationId: location.id, locationName: location.name })) }))
  const pendingInvitations: PendingInvitationView[] = invitationRows.map((invitation) => ({ id: invitation.id, invitedName: invitation.invitedName, normalizedEmail: invitation.normalizedEmail, role: invitation.role as PendingInvitationView['role'], expiresAt: invitation.expiresAt, locations: invitation.Locations.map(({ location }) => location), qualifications: invitation.Qualifications.map(({ offering, location }) => ({ offeringId: offering.id, offeringName: offering.name, locationId: location.id, locationName: location.name })) }))
  const activeMembers = members.filter(({ active }) => active)
  const inactiveMembers = members.filter(({ active }) => !active)

  return <div className="space-y-10">
    <header><p className="text-xs font-bold uppercase tracking-[.18em] text-clay-600">People and access</p><h1 className="mt-2 font-display text-4xl text-cocoa-950">Team</h1><p className="mt-2 max-w-3xl text-cocoa-600">Invite people, scope their locations and service qualifications, and retain history when access is deactivated.</p></header>
    <TeamInvitationForm role={context.membership.role as 'OWNER' | 'MANAGER'} locations={locations} qualificationOptions={qualificationOptions} action={createInvitationAction} />
    <section aria-labelledby="active-team-heading" className="space-y-4"><h2 id="active-team-heading" className="font-display text-3xl text-cocoa-950">Active team</h2><div className="grid gap-5 lg:grid-cols-2">{activeMembers.map((member) => <TeamMemberCard key={member.id} actorRole={context.membership.role as 'OWNER' | 'MANAGER'} member={member} locations={locations} qualificationOptions={qualificationOptions} action={updateMemberAccessAction} />)}</div>{!activeMembers.length ? <p className="text-cocoa-600">No active team members in this view.</p> : null}</section>
    <section aria-labelledby="pending-team-heading" className="space-y-4"><h2 id="pending-team-heading" className="font-display text-3xl text-cocoa-950">Pending invitations</h2><div className="grid gap-5 lg:grid-cols-2">{pendingInvitations.map((invitation) => <PendingInvitationCard key={invitation.id} invitation={invitation} resendAction={resendInvitationAction} revokeAction={revokeInvitationAction} />)}</div>{!pendingInvitations.length ? <p className="text-cocoa-600">No pending invitations.</p> : null}</section>
    <section aria-labelledby="inactive-team-heading" className="space-y-4"><h2 id="inactive-team-heading" className="font-display text-3xl text-cocoa-950">Inactive team</h2><div className="grid gap-5 lg:grid-cols-2">{inactiveMembers.map((member) => <TeamMemberCard key={member.id} actorRole={context.membership.role as 'OWNER' | 'MANAGER'} member={member} locations={locations} qualificationOptions={qualificationOptions} action={updateMemberAccessAction} />)}</div>{!inactiveMembers.length ? <p className="text-cocoa-600">No inactive team members.</p> : null}</section>
  </div>
}
