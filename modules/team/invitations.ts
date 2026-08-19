import { createHash, randomBytes } from 'node:crypto'
import type { BusinessRole, Prisma, Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { canManageRequestedRole } from './permissions'

const invitationLifetimeMs = 7 * 24 * 60 * 60 * 1000
const serializableTransaction = { isolationLevel: 'Serializable' as const }

export type InvitationQualificationInput = { offeringId: string; locationId: string }

export type InvitationRecord = {
  id: string
  businessId: string
  normalizedEmail: string
  invitedName: string
  role: BusinessRole
  tokenHash: string
  expiresAt: Date
  acceptedAt: Date | null
  revokedAt: Date | null
  inviterId: string
  activeKey: string | null
  locationIds: string[]
  qualifications: InvitationQualificationInput[]
}

type TeamActorAccess = {
  membershipId: string
  businessId: string
  role: BusinessRole
  active: boolean
  assignedLocationIds: string[]
}

type ExistingMembership = { id: string; role: BusinessRole; active: boolean }

export type InvitationTransaction = {
  getActorAccess(input: { actorId: string; businessId: string }): Promise<TeamActorAccess | null>
  findMembershipByEmail(input: { businessId: string; normalizedEmail: string }): Promise<ExistingMembership | null>
  findPendingByEmail(input: { businessId: string; normalizedEmail: string }): Promise<InvitationRecord | null>
  loadValidScope(input: { businessId: string; locationIds: string[]; qualifications: InvitationQualificationInput[] }): Promise<{ locationIds: string[]; qualificationKeys: string[] }>
  closeExpiredInvitation(input: { invitationId: string; now: Date }): Promise<void>
  createInvitation(input: Omit<InvitationRecord, 'id' | 'acceptedAt' | 'revokedAt'>): Promise<InvitationRecord>
  getInvitationById(input: { invitationId: string }): Promise<InvitationRecord | null>
  getInvitationByTokenHash(input: { tokenHash: string }): Promise<InvitationRecord | null>
  rotateInvitation(input: { invitationId: string; tokenHash: string; expiresAt: Date }): Promise<InvitationRecord>
  revokeInvitation(input: { invitationId: string; now: Date }): Promise<InvitationRecord>
  findUser(input: { actorId: string }): Promise<{ id: string; email: string } | null>
  findMembership(input: { businessId: string; userId: string }): Promise<ExistingMembership | null>
  createOrReactivateMembership(input: { businessId: string; userId: string; role: BusinessRole }): Promise<ExistingMembership>
  replaceMemberScope(input: { membershipId: string; locationIds: string[]; qualifications: InvitationQualificationInput[] }): Promise<void>
  markAccepted(input: { invitationId: string; now: Date }): Promise<boolean>
  createAudit(input: { businessId: string; actorId: string; actorRole: Role; action: string; details: Record<string, unknown> }): Promise<void>
}

export type InvitationRepository = {
  transaction<T>(work: (transaction: InvitationTransaction) => Promise<T>, options?: { isolationLevel?: 'Serializable' }): Promise<T>
}

export type CreateInvitationInput = {
  actorId: string
  businessId: string
  name: string
  email: string
  role: BusinessRole
  locationIds: string[]
  qualifications: InvitationQualificationInput[]
  now?: Date
}

export type InvitationTokenResult = {
  id: string
  email: string
  role: BusinessRole
  token: string
  expiresAt: Date
}

const teamError = (code: string) => Object.assign(new Error(code), { code })

export function normalizeInvitationEmail(value: string) {
  const email = value.trim().toLowerCase()
  if (!email || email.length > 191 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw teamError('INVITATION_EMAIL_INVALID')
  return email
}

export function hashInvitationToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function invitationAuthenticationUrls(token: string) {
  const invitationPath = `/invitations/${encodeURIComponent(token)}`
  const callback = encodeURIComponent(invitationPath)
  return { signIn: `/auth/sign-in?callbackUrl=${callback}`, signUp: `/auth/signup?callbackUrl=${callback}` }
}

function normalizeName(value: string) {
  const name = value.trim().replace(/\s+/g, ' ')
  if (!name || name.length > 120) throw teamError('INVITATION_NAME_INVALID')
  return name
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function uniqueQualifications(values: InvitationQualificationInput[]) {
  const qualifications = new Map<string, InvitationQualificationInput>()
  for (const value of values) {
    if (!value.offeringId || !value.locationId) throw teamError('INVITATION_QUALIFICATION_DENIED')
    qualifications.set(`${value.offeringId}:${value.locationId}`, value)
  }
  return Array.from(qualifications.values())
}

function activeInvitationKey(businessId: string, normalizedEmail: string) {
  return hashInvitationToken(`${businessId}:${normalizedEmail}`)
}

function auditRole(role: BusinessRole): Role {
  if (role === 'OWNER') return 'OWNER'
  if (role === 'ACCOUNTS') return 'ACCOUNTANT'
  return 'USER'
}

async function requireActor(transaction: InvitationTransaction, input: { actorId: string; businessId: string }) {
  const actor = await transaction.getActorAccess(input)
  if (!actor?.active || !['OWNER', 'MANAGER'].includes(actor.role)) throw teamError('TEAM_ACCESS_DENIED')
  return actor
}

async function validateScope(
  transaction: InvitationTransaction,
  input: { businessId: string; role: BusinessRole; locationIds: string[]; qualifications: InvitationQualificationInput[] },
  actor: TeamActorAccess,
) {
  const locationIds = unique(input.locationIds)
  const qualifications = uniqueQualifications(input.qualifications)
  if (input.role !== 'STAFF' && qualifications.length) throw teamError('INVITATION_QUALIFICATION_DENIED')
  if (qualifications.some(({ locationId }) => !locationIds.includes(locationId))) throw teamError('INVITATION_QUALIFICATION_DENIED')
  const valid = await transaction.loadValidScope({ businessId: input.businessId, locationIds, qualifications })
  if (valid.locationIds.length !== locationIds.length || locationIds.some((locationId) => !valid.locationIds.includes(locationId))) throw teamError('INVITATION_LOCATION_DENIED')
  if (actor.role === 'MANAGER' && locationIds.some((locationId) => !actor.assignedLocationIds.includes(locationId))) throw teamError('INVITATION_LOCATION_DENIED')
  const validQualificationKeys = new Set(valid.qualificationKeys)
  if (qualifications.some(({ offeringId, locationId }) => !validQualificationKeys.has(`${offeringId}:${locationId}`))) throw teamError('INVITATION_QUALIFICATION_DENIED')
  return { locationIds, qualifications }
}

function assertPending(invitation: InvitationRecord, now: Date, allowExpired: boolean) {
  if (invitation.acceptedAt) throw teamError('INVITATION_ALREADY_ACCEPTED')
  if (invitation.revokedAt) throw teamError('INVITATION_REVOKED')
  if (!allowExpired && invitation.expiresAt.getTime() <= now.getTime()) throw teamError('INVITATION_EXPIRED')
}

export async function createInvitation(input: CreateInvitationInput, repository: InvitationRepository = defaultRepository): Promise<InvitationTokenResult> {
  const now = input.now ?? new Date()
  const normalizedEmail = normalizeInvitationEmail(input.email)
  const invitedName = normalizeName(input.name)
  const token = randomBytes(32).toString('hex')
  const tokenHash = hashInvitationToken(token)
  const expiresAt = new Date(now.getTime() + invitationLifetimeMs)

  const invitation = await repository.transaction(async (transaction) => {
    const actor = await requireActor(transaction, input)
    if (!canManageRequestedRole({ actorRole: actor.role, requestedRole: input.role })) throw teamError('INVITATION_ROLE_DENIED')
    const membership = await transaction.findMembershipByEmail({ businessId: input.businessId, normalizedEmail })
    if (membership?.active) throw teamError('INVITATION_ALREADY_MEMBER')
    const scope = await validateScope(transaction, { businessId: input.businessId, role: input.role, locationIds: input.locationIds, qualifications: input.qualifications }, actor)
    const pending = await transaction.findPendingByEmail({ businessId: input.businessId, normalizedEmail })
    if (pending) {
      if (pending.expiresAt.getTime() > now.getTime()) throw teamError('INVITATION_ALREADY_PENDING')
      await transaction.closeExpiredInvitation({ invitationId: pending.id, now })
    }
    const created = await transaction.createInvitation({
      businessId: input.businessId,
      normalizedEmail,
      invitedName,
      role: input.role,
      tokenHash,
      expiresAt,
      inviterId: input.actorId,
      activeKey: activeInvitationKey(input.businessId, normalizedEmail),
      ...scope,
    })
    await transaction.createAudit({ businessId: input.businessId, actorId: input.actorId, actorRole: auditRole(actor.role), action: 'TEAM_INVITATION_CREATED', details: { invitationId: created.id, normalizedEmail, role: input.role, locationIds: scope.locationIds, qualifications: scope.qualifications } })
    return created
  }, serializableTransaction)

  return { id: invitation.id, email: invitation.normalizedEmail, role: invitation.role, token, expiresAt: invitation.expiresAt }
}

export async function resendInvitation(input: { actorId: string; invitationId: string; now?: Date }, repository: InvitationRepository = defaultRepository): Promise<InvitationTokenResult> {
  const now = input.now ?? new Date()
  const token = randomBytes(32).toString('hex')
  const tokenHash = hashInvitationToken(token)
  const expiresAt = new Date(now.getTime() + invitationLifetimeMs)
  const invitation = await repository.transaction(async (transaction) => {
    const current = await transaction.getInvitationById({ invitationId: input.invitationId })
    if (!current) throw teamError('INVITATION_NOT_FOUND')
    const actor = await requireActor(transaction, { actorId: input.actorId, businessId: current.businessId })
    if (!canManageRequestedRole({ actorRole: actor.role, requestedRole: current.role })) throw teamError('INVITATION_ROLE_DENIED')
    assertPending(current, now, true)
    await validateScope(transaction, current, actor)
    const rotated = await transaction.rotateInvitation({ invitationId: current.id, tokenHash, expiresAt })
    await transaction.createAudit({ businessId: current.businessId, actorId: input.actorId, actorRole: auditRole(actor.role), action: 'TEAM_INVITATION_RESENT', details: { invitationId: current.id, normalizedEmail: current.normalizedEmail, expiresAt: expiresAt.toISOString() } })
    return rotated
  }, serializableTransaction)
  return { id: invitation.id, email: invitation.normalizedEmail, role: invitation.role, token, expiresAt: invitation.expiresAt }
}

export async function revokeInvitation(input: { actorId: string; invitationId: string; now?: Date }, repository: InvitationRepository = defaultRepository) {
  const now = input.now ?? new Date()
  return repository.transaction(async (transaction) => {
    const current = await transaction.getInvitationById({ invitationId: input.invitationId })
    if (!current) throw teamError('INVITATION_NOT_FOUND')
    const actor = await requireActor(transaction, { actorId: input.actorId, businessId: current.businessId })
    if (!canManageRequestedRole({ actorRole: actor.role, requestedRole: current.role })) throw teamError('INVITATION_ROLE_DENIED')
    assertPending(current, now, true)
    await validateScope(transaction, current, actor)
    const revoked = await transaction.revokeInvitation({ invitationId: current.id, now })
    await transaction.createAudit({ businessId: current.businessId, actorId: input.actorId, actorRole: auditRole(actor.role), action: 'TEAM_INVITATION_REVOKED', details: { invitationId: current.id, normalizedEmail: current.normalizedEmail } })
    return { id: revoked.id, revokedAt: revoked.revokedAt! }
  }, serializableTransaction)
}

export async function acceptInvitation(input: { token: string; actorId: string; now?: Date }, repository: InvitationRepository = defaultRepository) {
  const now = input.now ?? new Date()
  const tokenHash = hashInvitationToken(input.token)
  return repository.transaction(async (transaction) => {
    const invitation = await transaction.getInvitationByTokenHash({ tokenHash })
    if (!invitation) throw teamError('INVITATION_NOT_FOUND')
    assertPending(invitation, now, false)
    if (!['MANAGER', 'ACCOUNTS', 'STAFF'].includes(invitation.role)) throw teamError('INVITATION_ROLE_DENIED')
    const user = await transaction.findUser({ actorId: input.actorId })
    if (!user) throw teamError('AUTHENTICATION_REQUIRED')
    if (normalizeInvitationEmail(user.email) !== invitation.normalizedEmail) throw teamError('INVITATION_EMAIL_MISMATCH')
    const acceptanceActor: TeamActorAccess = { membershipId: '', businessId: invitation.businessId, role: 'OWNER', active: true, assignedLocationIds: invitation.locationIds }
    const scope = await validateScope(transaction, invitation, acceptanceActor)
    const existing = await transaction.findMembership({ businessId: invitation.businessId, userId: user.id })
    if (existing?.active) throw teamError('INVITATION_ALREADY_MEMBER')
    if (existing?.role === 'OWNER') throw teamError('LAST_OWNER_PROTECTED')
    if (!await transaction.markAccepted({ invitationId: invitation.id, now })) throw teamError('INVITATION_ALREADY_ACCEPTED')
    const membership = await transaction.createOrReactivateMembership({ businessId: invitation.businessId, userId: user.id, role: invitation.role })
    await transaction.replaceMemberScope({ membershipId: membership.id, locationIds: scope.locationIds, qualifications: invitation.role === 'STAFF' ? scope.qualifications : [] })
    await transaction.createAudit({ businessId: invitation.businessId, actorId: user.id, actorRole: 'USER', action: 'TEAM_INVITATION_ACCEPTED', details: { invitationId: invitation.id, membershipId: membership.id, role: invitation.role, locationIds: scope.locationIds, qualifications: scope.qualifications } })
    return { businessId: invitation.businessId, membershipId: membership.id, created: !existing }
  }, serializableTransaction)
}

function mapInvitation(row: any): InvitationRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    normalizedEmail: row.normalizedEmail,
    invitedName: row.invitedName,
    role: row.role,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    acceptedAt: row.acceptedAt,
    revokedAt: row.revokedAt,
    inviterId: row.inviterId,
    activeKey: row.activeKey,
    locationIds: row.Locations.map(({ locationId }: any) => locationId),
    qualifications: row.Qualifications.map(({ offeringId, locationId }: any) => ({ offeringId, locationId })),
  }
}

type InvitationRepositoryClient = {
  $transaction<T>(work: (transaction: Prisma.TransactionClient) => Promise<T>, options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): Promise<T>
}

export function createPrismaInvitationRepository(client: InvitationRepositoryClient): InvitationRepository {
  return {
    transaction(work, options) {
      return client.$transaction(async (transaction) => work({
        async getActorAccess({ actorId, businessId }) {
          const membership = await transaction.businessMembership.findFirst({ where: { businessId, userId: actorId, active: true }, select: { id: true, businessId: true, role: true, active: true, Locations: { select: { locationId: true } } } })
          return membership ? { membershipId: membership.id, businessId: membership.businessId, role: membership.role, active: membership.active, assignedLocationIds: membership.Locations.map(({ locationId }) => locationId) } : null
        },
        findMembershipByEmail: ({ businessId, normalizedEmail }) => transaction.businessMembership.findFirst({ where: { businessId, user: { is: { email: normalizedEmail } } }, select: { id: true, role: true, active: true } }),
        async findPendingByEmail({ businessId, normalizedEmail }) {
          const row = await transaction.businessInvitation.findFirst({ where: { businessId, normalizedEmail, acceptedAt: null, revokedAt: null }, include: { Locations: true, Qualifications: true }, orderBy: { createdAt: 'desc' } })
          return row ? mapInvitation(row) : null
        },
        async loadValidScope({ businessId, locationIds, qualifications }) {
          const [locations, targets] = await Promise.all([
            transaction.location.findMany({ where: { id: { in: locationIds }, businessId, isActive: true }, select: { id: true } }),
            qualifications.length ? transaction.serviceLocation.findMany({ where: { active: true, OR: qualifications.map(({ offeringId, locationId }) => ({ offeringId, locationId })), offering: { businessId, active: true }, location: { businessId, isActive: true } }, select: { offeringId: true, locationId: true } }) : Promise.resolve([]),
          ])
          return { locationIds: locations.map(({ id }) => id), qualificationKeys: targets.map(({ offeringId, locationId }) => `${offeringId}:${locationId}`) }
        },
        async closeExpiredInvitation({ invitationId, now }) {
          await transaction.businessInvitation.update({ where: { id: invitationId }, data: { revokedAt: now, activeKey: null } })
        },
        async createInvitation(input) {
          const row = await transaction.businessInvitation.create({ data: { businessId: input.businessId, normalizedEmail: input.normalizedEmail, invitedName: input.invitedName, role: input.role, tokenHash: input.tokenHash, expiresAt: input.expiresAt, inviterId: input.inviterId, activeKey: input.activeKey, Locations: { create: input.locationIds.map((locationId) => ({ locationId })) }, Qualifications: { create: input.qualifications.map(({ offeringId, locationId }) => ({ offeringId, locationId })) } }, include: { Locations: true, Qualifications: true } })
          return mapInvitation(row)
        },
        async getInvitationById({ invitationId }) {
          const row = await transaction.businessInvitation.findUnique({ where: { id: invitationId }, include: { Locations: true, Qualifications: true } })
          return row ? mapInvitation(row) : null
        },
        async getInvitationByTokenHash({ tokenHash }) {
          const row = await transaction.businessInvitation.findUnique({ where: { tokenHash }, include: { Locations: true, Qualifications: true } })
          return row ? mapInvitation(row) : null
        },
        async rotateInvitation({ invitationId, tokenHash, expiresAt }) {
          const row = await transaction.businessInvitation.update({ where: { id: invitationId }, data: { tokenHash, expiresAt }, include: { Locations: true, Qualifications: true } })
          return mapInvitation(row)
        },
        async revokeInvitation({ invitationId, now }) {
          const row = await transaction.businessInvitation.update({ where: { id: invitationId }, data: { revokedAt: now, activeKey: null }, include: { Locations: true, Qualifications: true } })
          return mapInvitation(row)
        },
        findUser: ({ actorId }) => transaction.user.findUnique({ where: { id: actorId }, select: { id: true, email: true } }),
        findMembership: ({ businessId, userId }) => transaction.businessMembership.findUnique({ where: { businessId_userId: { businessId, userId } }, select: { id: true, role: true, active: true } }),
        createOrReactivateMembership: ({ businessId, userId, role }) => transaction.businessMembership.upsert({ where: { businessId_userId: { businessId, userId } }, create: { businessId, userId, role, active: true }, update: { role, active: true }, select: { id: true, role: true, active: true } }),
        async replaceMemberScope({ membershipId, locationIds, qualifications }) {
          await transaction.locationAssignment.deleteMany({ where: { membershipId } })
          if (locationIds.length) await transaction.locationAssignment.createMany({ data: locationIds.map((locationId) => ({ membershipId, locationId })) })
          await transaction.staffQualification.updateMany({ where: { membershipId, active: true }, data: { active: false } })
          for (const qualification of qualifications) {
            await transaction.staffQualification.upsert({ where: { membershipId_offeringId_locationId: { membershipId, ...qualification } }, create: { membershipId, ...qualification, active: true }, update: { active: true } })
          }
        },
        async markAccepted({ invitationId, now }) {
          const result = await transaction.businessInvitation.updateMany({ where: { id: invitationId, acceptedAt: null, revokedAt: null }, data: { acceptedAt: now, activeKey: null } })
          return result.count === 1
        },
        async createAudit(input) {
          await transaction.auditLog.create({ data: { actorId: input.actorId, actorRole: input.actorRole, action: input.action, details: { businessId: input.businessId, ...input.details } } })
        },
      }), options)
    },
  }
}

const defaultRepository = createPrismaInvitationRepository(prisma)
