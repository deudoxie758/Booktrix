import type { BusinessRole, Prisma, Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { canManageMemberRole, canManageRequestedRole } from './permissions'
import type { InvitationQualificationInput } from './invitations'

const serializableTransaction = { isolationLevel: 'Serializable' as const }
const teamError = (code: string) => Object.assign(new Error(code), { code })

type TeamActorAccess = {
  membershipId: string
  businessId: string
  role: BusinessRole
  active: boolean
  assignedLocationIds: string[]
}

export type TeamMemberRecord = {
  id: string
  businessId: string
  userId: string
  role: BusinessRole
  active: boolean
  locationIds: string[]
  qualifications: InvitationQualificationInput[]
}

export type TeamManagementTransaction = {
  getActorAccess(input: { actorId: string; businessId: string }): Promise<TeamActorAccess | null>
  getMember(input: { businessId: string; membershipId: string }): Promise<TeamMemberRecord | null>
  countActiveOwners(input: { businessId: string }): Promise<number>
  loadValidScope(input: { businessId: string; locationIds: string[]; qualifications: InvitationQualificationInput[] }): Promise<{ locationIds: string[]; qualificationKeys: string[] }>
  setMemberAccess(input: { membershipId: string; role: BusinessRole; active: boolean; locationIds: string[]; qualifications: InvitationQualificationInput[]; preserveScope: boolean }): Promise<TeamMemberRecord>
  createAudit(input: { businessId: string; actorId: string; actorRole: Role; action: string; details: Record<string, unknown> }): Promise<void>
}

export type TeamManagementRepository = {
  transaction<T>(work: (transaction: TeamManagementTransaction) => Promise<T>, options?: { isolationLevel?: 'Serializable' }): Promise<T>
}

export type UpdateMemberAccessInput = {
  actorId: string
  businessId: string
  membershipId: string
  role: BusinessRole
  active: boolean
  locationIds: string[]
  qualifications: InvitationQualificationInput[]
}

function auditRole(role: BusinessRole): Role {
  if (role === 'OWNER') return 'OWNER'
  if (role === 'ACCOUNTS') return 'ACCOUNTANT'
  return 'USER'
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function uniqueQualifications(values: InvitationQualificationInput[]) {
  const result = new Map<string, InvitationQualificationInput>()
  for (const value of values) {
    if (!value.offeringId || !value.locationId) throw teamError('TEAM_QUALIFICATION_DENIED')
    result.set(`${value.offeringId}:${value.locationId}`, value)
  }
  return Array.from(result.values())
}

function canSetRole(actorRole: BusinessRole, targetRole: BusinessRole, requestedRole: BusinessRole) {
  if (!canManageMemberRole({ actorRole, targetRole })) return false
  if (actorRole === 'OWNER' && targetRole === 'OWNER' && requestedRole === 'OWNER') return true
  return canManageRequestedRole({ actorRole, requestedRole })
}

async function validateScope(transaction: TeamManagementTransaction, input: UpdateMemberAccessInput, actor: TeamActorAccess) {
  const locationIds = unique(input.locationIds)
  const qualifications = uniqueQualifications(input.qualifications)
  if (input.role !== 'STAFF' && qualifications.length) throw teamError('TEAM_QUALIFICATION_DENIED')
  if (qualifications.some(({ locationId }) => !locationIds.includes(locationId))) throw teamError('TEAM_QUALIFICATION_DENIED')
  const valid = await transaction.loadValidScope({ businessId: input.businessId, locationIds, qualifications })
  if (valid.locationIds.length !== locationIds.length || locationIds.some((locationId) => !valid.locationIds.includes(locationId))) throw teamError('TEAM_LOCATION_DENIED')
  if (actor.role === 'MANAGER' && locationIds.some((locationId) => !actor.assignedLocationIds.includes(locationId))) throw teamError('TEAM_LOCATION_DENIED')
  const validQualifications = new Set(valid.qualificationKeys)
  if (qualifications.some(({ offeringId, locationId }) => !validQualifications.has(`${offeringId}:${locationId}`))) throw teamError('TEAM_QUALIFICATION_DENIED')
  return { locationIds, qualifications }
}

export async function updateMemberAccess(input: UpdateMemberAccessInput, repository: TeamManagementRepository = defaultRepository) {
  return repository.transaction(async (transaction) => {
    const actor = await transaction.getActorAccess({ actorId: input.actorId, businessId: input.businessId })
    if (!actor?.active || !['OWNER', 'MANAGER'].includes(actor.role)) throw teamError('TEAM_ACCESS_DENIED')
    const target = await transaction.getMember({ businessId: input.businessId, membershipId: input.membershipId })
    if (!target) throw teamError('TEAM_MEMBER_NOT_FOUND')
    if (!canSetRole(actor.role, target.role, input.role)) throw teamError('TEAM_ROLE_DENIED')
    if (actor.role === 'MANAGER' && target.locationIds.some((locationId) => !actor.assignedLocationIds.includes(locationId))) throw teamError('TEAM_LOCATION_DENIED')
    if (target.role === 'OWNER' && target.active && (input.role !== 'OWNER' || !input.active) && await transaction.countActiveOwners({ businessId: input.businessId }) <= 1) throw teamError('LAST_OWNER_PROTECTED')
    const scope = await validateScope(transaction, input, actor)
    const updated = await transaction.setMemberAccess({ membershipId: target.id, role: input.role, active: input.active, ...scope, preserveScope: !input.active })
    await transaction.createAudit({
      businessId: input.businessId,
      actorId: input.actorId,
      actorRole: auditRole(actor.role),
      action: 'TEAM_MEMBER_ACCESS_UPDATED',
      details: {
        membershipId: target.id,
        before: { role: target.role, active: target.active, locationIds: target.locationIds, qualifications: target.qualifications },
        after: { role: updated.role, active: updated.active, locationIds: updated.locationIds, qualifications: updated.qualifications },
      },
    })
    return { ok: true as const, membershipId: updated.id }
  }, serializableTransaction)
}

function mapMember(row: any): TeamMemberRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    userId: row.userId,
    role: row.role,
    active: row.active,
    locationIds: row.Locations.map(({ locationId }: any) => locationId),
    qualifications: row.Qualifications.filter(({ active }: any) => active).map(({ offeringId, locationId }: any) => ({ offeringId, locationId })),
  }
}

type TeamManagementRepositoryClient = {
  $transaction<T>(work: (transaction: Prisma.TransactionClient) => Promise<T>, options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): Promise<T>
}

export function createPrismaTeamManagementRepository(client: TeamManagementRepositoryClient): TeamManagementRepository {
  return {
    transaction(work, options) {
      return client.$transaction(async (transaction) => work({
        async getActorAccess({ actorId, businessId }) {
          const membership = await transaction.businessMembership.findFirst({ where: { businessId, userId: actorId, active: true }, select: { id: true, businessId: true, role: true, active: true, Locations: { select: { locationId: true } } } })
          return membership ? { membershipId: membership.id, businessId: membership.businessId, role: membership.role, active: membership.active, assignedLocationIds: membership.Locations.map(({ locationId }) => locationId) } : null
        },
        async getMember({ businessId, membershipId }) {
          const row = await transaction.businessMembership.findFirst({ where: { id: membershipId, businessId }, include: { Locations: true, Qualifications: true } })
          return row ? mapMember(row) : null
        },
        countActiveOwners: ({ businessId }) => transaction.businessMembership.count({ where: { businessId, role: 'OWNER', active: true } }),
        async loadValidScope({ businessId, locationIds, qualifications }) {
          const [locations, targets] = await Promise.all([
            transaction.location.findMany({ where: { id: { in: locationIds }, businessId, isActive: true }, select: { id: true } }),
            qualifications.length ? transaction.serviceLocation.findMany({ where: { active: true, OR: qualifications.map(({ offeringId, locationId }) => ({ offeringId, locationId })), offering: { businessId, active: true }, location: { businessId, isActive: true } }, select: { offeringId: true, locationId: true } }) : Promise.resolve([]),
          ])
          return { locationIds: locations.map(({ id }) => id), qualificationKeys: targets.map(({ offeringId, locationId }) => `${offeringId}:${locationId}`) }
        },
        async setMemberAccess({ membershipId, role, active, locationIds, qualifications, preserveScope }) {
          await transaction.businessMembership.update({ where: { id: membershipId }, data: { role, active } })
          if (!preserveScope) {
            await transaction.locationAssignment.deleteMany({ where: { membershipId } })
            if (locationIds.length) await transaction.locationAssignment.createMany({ data: locationIds.map((locationId) => ({ membershipId, locationId })) })
            await transaction.staffQualification.updateMany({ where: { membershipId, active: true }, data: { active: false } })
            for (const qualification of qualifications) {
              await transaction.staffQualification.upsert({ where: { membershipId_offeringId_locationId: { membershipId, ...qualification } }, create: { membershipId, ...qualification, active: true }, update: { active: true } })
            }
          }
          const row = await transaction.businessMembership.findUniqueOrThrow({ where: { id: membershipId }, include: { Locations: true, Qualifications: true } })
          return mapMember(row)
        },
        async createAudit(input) {
          await transaction.auditLog.create({ data: { actorId: input.actorId, actorRole: input.actorRole, action: input.action, details: { businessId: input.businessId, ...input.details } } })
        },
      }), options)
    },
  }
}

const defaultRepository = createPrismaTeamManagementRepository(prisma)
