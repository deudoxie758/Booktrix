import type { BusinessRole, Prisma, Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { resolveBusinessContext } from '@/modules/organizations/context'
import {
  parseLocationHours,
  parseLocationValues,
  type LocationHoursInput,
  type LocationValuesInput,
  type NormalizedLocationHour,
  type NormalizedLocationValues,
} from './schema'

export type LocationMutationResult =
  | { ok: true; locationId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

export type ManagedLocation = {
  id: string
  businessId: string
  name: string
  slug: string
  address: string | null
  phone: string | null
  email: string | null
  timezone: string
  isActive: boolean
  hours: NormalizedLocationHour[]
  serviceCount: number
  teamCount: number
}

type Authorization = {
  businessId: string
  role: BusinessRole
  membershipId?: string
  assignedLocationIds: string[]
}

export type LocationManagementRepository = {
  authorize(input: { actorId: string; businessId: string }): Promise<Authorization>
  findLocation(input: { businessId: string; locationId: string }): Promise<{ id: string; businessId: string } | null>
  isSlugTaken(input: { businessId: string; slug: string; excludeLocationId?: string }): Promise<boolean>
  create(input: { actorId: string; businessId: string; assignMembershipId?: string; values: NormalizedLocationValues }): Promise<{ id: string }>
  update(input: { actorId: string; businessId: string; locationId: string; values: Omit<NormalizedLocationValues, 'isActive'> }): Promise<{ id: string }>
  replaceHours(input: { actorId: string; businessId: string; locationId: string; hours: NormalizedLocationHour[] }): Promise<{ id: string }>
  setActiveWithAudit(input: { businessId: string; actorId: string; locationId: string; active: boolean }): Promise<{ id: string }>
  list(input: { businessId: string; locationIds?: string[] }): Promise<ManagedLocation[]>
}

type LocationMutationTransaction = Pick<Prisma.TransactionClient, 'businessMembership' | 'location' | 'locationAssignment' | 'locationHours' | 'auditLog'>

export type LocationRepositoryClient = Pick<Prisma.TransactionClient, 'location'> & {
  $transaction<T>(callback: (transaction: LocationMutationTransaction) => Promise<T>, options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): Promise<T>
}

const serializableTransaction = { isolationLevel: 'Serializable' as const }

const businessDenied = () => Object.assign(new Error('BUSINESS_ACCESS_DENIED'), { code: 'BUSINESS_ACCESS_DENIED' })
const locationDenied = () => Object.assign(new Error('LOCATION_ACCESS_DENIED'), { code: 'LOCATION_ACCESS_DENIED' })
const duplicateSlug = (): LocationMutationResult => ({ ok: false, error: 'Please correct the highlighted fields.', fieldErrors: { slug: 'This slug is already used by another location.' } })

function auditActorRole(role: BusinessRole): Role {
  if (role === 'OWNER') return 'OWNER'
  if (role === 'ACCOUNTS') return 'ACCOUNTANT'
  return 'USER'
}

async function requireTransactionalMutationAccess(
  transaction: LocationMutationTransaction,
  input: { actorId: string; businessId: string; locationId?: string },
) {
  const membership = await transaction.businessMembership.findFirst({
    where: { businessId: input.businessId, userId: input.actorId, active: true },
    select: { id: true, role: true },
  })
  if (!membership || !['OWNER', 'MANAGER'].includes(membership.role)) throw businessDenied()
  if (!input.locationId) return membership

  const location = await transaction.location.findFirst({
    where: { id: input.locationId, businessId: input.businessId },
    select: { id: true },
  })
  if (!location) throw locationDenied()
  if (membership.role === 'MANAGER') {
    const assignment = await transaction.locationAssignment.findUnique({
      where: { membershipId_locationId: { membershipId: membership.id, locationId: input.locationId } },
      select: { membershipId: true },
    })
    if (!assignment) throw locationDenied()
  }
  return membership
}

export function createPrismaLocationRepository(client: LocationRepositoryClient): LocationManagementRepository {
  return {
    async authorize({ actorId, businessId }) {
      const context = await resolveBusinessContext(actorId, businessId)
      if (context.business.id !== businessId) throw businessDenied()
      return {
        businessId,
        role: context.membership.role,
        membershipId: context.membership.id,
        assignedLocationIds: context.membership.Locations.map(({ locationId }) => locationId),
      }
    },
    findLocation: ({ businessId, locationId }) => client.location.findFirst({ where: { id: locationId, businessId }, select: { id: true, businessId: true } }),
    async isSlugTaken({ businessId, slug, excludeLocationId }) {
      return (await client.location.count({ where: { businessId, slug, ...(excludeLocationId ? { id: { not: excludeLocationId } } : {}) } })) > 0
    },
    create: ({ actorId, businessId, assignMembershipId, values }) => client.$transaction(async (transaction) => {
      const membership = await requireTransactionalMutationAccess(transaction, { actorId, businessId })
      if (membership.role === 'MANAGER' && assignMembershipId !== membership.id) throw businessDenied()
      const location = await transaction.location.create({ data: { businessId, ...values }, select: { id: true } })
      if (membership.role === 'MANAGER') await transaction.locationAssignment.create({ data: { membershipId: membership.id, locationId: location.id } })
      return location
    }, serializableTransaction),
    update: ({ actorId, businessId, locationId, values }) => client.$transaction(async (transaction) => {
      await requireTransactionalMutationAccess(transaction, { actorId, businessId, locationId })
      return transaction.location.update({ where: { id: locationId }, data: values, select: { id: true } })
    }, serializableTransaction),
    replaceHours: ({ actorId, businessId, locationId, hours }) => client.$transaction(async (transaction) => {
      await requireTransactionalMutationAccess(transaction, { actorId, businessId, locationId })
      await transaction.locationHours.deleteMany({ where: { locationId } })
      if (hours.length) await transaction.locationHours.createMany({ data: hours.map((hour) => ({ locationId, ...hour })) })
      return { id: locationId }
    }, serializableTransaction),
    setActiveWithAudit: ({ businessId, actorId, locationId, active }) => client.$transaction(async (transaction) => {
      const membership = await requireTransactionalMutationAccess(transaction, { actorId, businessId, locationId })
      await transaction.location.update({ where: { id: locationId }, data: { isActive: active }, select: { id: true } })
      await transaction.auditLog.create({
        data: {
          actorId,
          actorRole: auditActorRole(membership.role),
          action: active ? 'LOCATION_ACTIVATED' : 'LOCATION_DEACTIVATED',
          details: { businessId, locationId, active },
        },
      })
      return { id: locationId }
    }, serializableTransaction),
    async list({ businessId, locationIds }) {
      const rows = await client.location.findMany({
        where: { businessId, ...(locationIds ? { id: { in: locationIds } } : {}) },
        include: {
          Hours: { orderBy: { weekday: 'asc' } },
          _count: {
            select: {
              Assignments: true,
              ServiceLocations: { where: { active: true } },
            },
          },
        },
        orderBy: { name: 'asc' },
      })
      return rows.map((row) => ({
        id: row.id,
        businessId: row.businessId,
        name: row.name,
        slug: row.slug,
        address: row.address,
        phone: row.phone,
        email: row.email,
        timezone: row.timezone,
        isActive: row.isActive,
        hours: row.Hours.map(({ weekday, startMinute, endMinute }) => ({ weekday, startMinute, endMinute })),
        serviceCount: row._count.ServiceLocations,
        teamCount: row._count.Assignments,
      }))
    },
  }
}

const defaultRepository = createPrismaLocationRepository(prisma as unknown as LocationRepositoryClient)

async function authorizeMutation(input: { actorId: string; businessId: string }, repository: LocationManagementRepository) {
  const authorization = await repository.authorize(input)
  if (authorization.businessId !== input.businessId || !['OWNER', 'MANAGER'].includes(authorization.role)) throw businessDenied()
  return authorization
}

async function authorizeTarget(
  input: { actorId: string; businessId: string; locationId: string },
  repository: LocationManagementRepository,
) {
  const authorization = await authorizeMutation(input, repository)
  const location = await repository.findLocation({ businessId: input.businessId, locationId: input.locationId })
  if (!location || location.businessId !== input.businessId) throw locationDenied()
  if (authorization.role !== 'OWNER' && !authorization.assignedLocationIds.includes(input.locationId)) throw locationDenied()
  return authorization
}

function isUniqueConstraint(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
}

export async function createLocation(
  input: { actorId: string; businessId: string; values: LocationValuesInput },
  repository: LocationManagementRepository = defaultRepository,
): Promise<LocationMutationResult> {
  const authorization = await authorizeMutation(input, repository)
  const parsed = parseLocationValues(input.values)
  if (parsed.ok === false) return parsed
  if (await repository.isSlugTaken({ businessId: input.businessId, slug: parsed.data.slug })) return duplicateSlug()
  try {
    const location = await repository.create({
      actorId: input.actorId,
      businessId: input.businessId,
      assignMembershipId: authorization.role === 'MANAGER' ? authorization.membershipId : undefined,
      values: parsed.data,
    })
    return { ok: true, locationId: location.id }
  } catch (error) {
    if (isUniqueConstraint(error)) return duplicateSlug()
    throw error
  }
}

export async function updateLocation(
  input: { actorId: string; businessId: string; locationId: string; values: LocationValuesInput },
  repository: LocationManagementRepository = defaultRepository,
): Promise<LocationMutationResult> {
  await authorizeTarget(input, repository)
  const parsed = parseLocationValues(input.values)
  if (parsed.ok === false) return parsed
  if (await repository.isSlugTaken({ businessId: input.businessId, slug: parsed.data.slug, excludeLocationId: input.locationId })) return duplicateSlug()
  const { isActive: _isActive, ...values } = parsed.data
  try {
    const location = await repository.update({ actorId: input.actorId, businessId: input.businessId, locationId: input.locationId, values })
    return { ok: true, locationId: location.id }
  } catch (error) {
    if (isUniqueConstraint(error)) return duplicateSlug()
    throw error
  }
}

export async function setLocationHours(
  input: { actorId: string; businessId: string; locationId: string; hours: LocationHoursInput[] },
  repository: LocationManagementRepository = defaultRepository,
): Promise<LocationMutationResult> {
  await authorizeTarget(input, repository)
  const parsed = parseLocationHours(input.hours)
  if (parsed.ok === false) return parsed
  const location = await repository.replaceHours({ actorId: input.actorId, businessId: input.businessId, locationId: input.locationId, hours: parsed.data })
  return { ok: true, locationId: location.id }
}

export async function setLocationActive(
  input: { actorId: string; businessId: string; locationId: string; active: boolean },
  repository: LocationManagementRepository = defaultRepository,
): Promise<LocationMutationResult> {
  await authorizeTarget(input, repository)
  const location = await repository.setActiveWithAudit(input)
  return { ok: true, locationId: location.id }
}

export async function listManagedLocations(
  input: { actorId: string; businessId: string },
  repository: LocationManagementRepository = defaultRepository,
) {
  const authorization = await repository.authorize(input)
  if (authorization.businessId !== input.businessId || !['OWNER', 'MANAGER', 'ACCOUNTS'].includes(authorization.role)) throw businessDenied()
  const locationIds = authorization.role === 'OWNER' ? undefined : authorization.assignedLocationIds
  const locations = await repository.list({ businessId: input.businessId, locationIds })
  const allowedIds = new Set(locationIds)
  return locations.filter((location) => location.businessId === input.businessId && (authorization.role === 'OWNER' || allowedIds.has(location.id)))
}
