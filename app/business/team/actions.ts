'use server'

import type { BusinessRole } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { requireWorkspaceRole } from '@/modules/organizations/context'
import { createInvitation, resendInvitation, revokeInvitation, type InvitationQualificationInput } from '@/modules/team/invitations'
import { updateMemberAccess } from '@/modules/team/management'
import type { TeamActionResult } from '@/components/business/TeamInvitationForm'

const validRoles = new Set<BusinessRole>(['OWNER', 'MANAGER', 'ACCOUNTS', 'STAFF'])

function refreshTeamConsumers() {
  for (const path of ['/business', '/business/team', '/business/schedule', '/business/services']) revalidatePath(path)
}

function parseRole(value: FormDataEntryValue | null): BusinessRole {
  const role = String(value ?? '') as BusinessRole
  if (!validRoles.has(role)) throw Object.assign(new Error('TEAM_ROLE_DENIED'), { code: 'TEAM_ROLE_DENIED' })
  return role
}

function parseQualifications(formData: FormData): InvitationQualificationInput[] {
  return formData.getAll('qualifications').map((value) => {
    const [offeringId, locationId, extra] = String(value).split('|')
    if (!offeringId || !locationId || extra) throw Object.assign(new Error('TEAM_QUALIFICATION_DENIED'), { code: 'TEAM_QUALIFICATION_DENIED' })
    return { offeringId, locationId }
  })
}

function errorResult(error: unknown): TeamActionResult {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : error instanceof Error ? error.message : ''
  const messages: Record<string, string> = {
    INVITATION_EMAIL_INVALID: 'Enter a valid email address.',
    INVITATION_NAME_INVALID: 'Enter the invited team member’s name.',
    INVITATION_ROLE_DENIED: 'You cannot invite that role.',
    INVITATION_LOCATION_DENIED: 'Choose only locations you are authorized to manage.',
    INVITATION_QUALIFICATION_DENIED: 'Choose qualifications offered at the selected business locations.',
    INVITATION_ALREADY_PENDING: 'A pending invitation already exists for this email. Resend it instead.',
    INVITATION_ALREADY_MEMBER: 'This email already belongs to an active team member.',
    INVITATION_ALREADY_ACCEPTED: 'This invitation has already been accepted.',
    INVITATION_REVOKED: 'This invitation has already been revoked.',
    TEAM_ROLE_DENIED: 'You cannot manage that team role.',
    TEAM_LOCATION_DENIED: 'Choose only locations you are authorized to manage.',
    TEAM_QUALIFICATION_DENIED: 'Choose qualifications offered at the selected business locations.',
    LAST_OWNER_PROTECTED: 'The last active owner cannot be deactivated or demoted.',
  }
  return { ok: false, error: messages[code] ?? 'Unable to update team access. Please try again.' }
}

async function teamContext() {
  return requireWorkspaceRole(['OWNER', 'MANAGER'])
}

export async function createInvitationAction(formData: FormData): Promise<TeamActionResult> {
  const context = await teamContext()
  try {
    const result = await createInvitation({
      actorId: context.actor.id,
      businessId: context.business.id,
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      role: parseRole(formData.get('role')),
      locationIds: formData.getAll('locationIds').map(String),
      qualifications: parseQualifications(formData),
    })
    refreshTeamConsumers()
    return { ok: true, invitationId: result.id, invitationUrl: `/invitations/${result.token}` }
  } catch (error) {
    return errorResult(error)
  }
}

export async function resendInvitationAction(formData: FormData): Promise<TeamActionResult> {
  const context = await teamContext()
  try {
    const result = await resendInvitation({ actorId: context.actor.id, businessId: context.business.id, invitationId: String(formData.get('invitationId') ?? '') })
    refreshTeamConsumers()
    return { ok: true, invitationId: result.id, invitationUrl: `/invitations/${result.token}` }
  } catch (error) {
    return errorResult(error)
  }
}

export async function revokeInvitationAction(formData: FormData): Promise<TeamActionResult> {
  const context = await teamContext()
  try {
    const result = await revokeInvitation({ actorId: context.actor.id, businessId: context.business.id, invitationId: String(formData.get('invitationId') ?? '') })
    refreshTeamConsumers()
    return { ok: true, invitationId: result.id }
  } catch (error) {
    return errorResult(error)
  }
}

export async function updateMemberAccessAction(formData: FormData): Promise<TeamActionResult> {
  const context = await teamContext()
  try {
    const activeValue = String(formData.get('active') ?? '')
    if (activeValue !== 'true' && activeValue !== 'false') throw Object.assign(new Error('TEAM_STATUS_INVALID'), { code: 'TEAM_STATUS_INVALID' })
    const result = await updateMemberAccess({
      actorId: context.actor.id,
      businessId: context.business.id,
      membershipId: String(formData.get('membershipId') ?? ''),
      role: parseRole(formData.get('role')),
      active: activeValue === 'true',
      locationIds: formData.getAll('locationIds').map(String),
      qualifications: parseQualifications(formData),
    })
    refreshTeamConsumers()
    return result
  } catch (error) {
    return errorResult(error)
  }
}
