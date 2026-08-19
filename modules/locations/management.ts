import type { BusinessRole, Role } from '@prisma/client'
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
  create(input: { businessId: string; assignMembershipId?: string; values: NormalizedLocationValues }): Promise<{ id: string }>
  update(input: { businessId: string; locationId: string; values: Omit<NormalizedLocationValues, 'isActive'> }): Promise<{ id: string }>
  replaceHours(input: { businessId: string; locationId: string; hours: NormalizedLocationHour[] }): Promise<{ id: string }>
  setActiveWithAudit(input: { businessId: string; actorId: string; locationId: string; active: boolean }): Promise<{ id: string }>
  list(input: { businessId: string; locationIds?: string[] }): Promise<ManagedLocation[]>
}

const businessDenied = () => Object.assign(new Error('BUSINESS_ACCESS_DENIED'), { code: 'BUSINESS_ACCESS_DENIED' })
const locationDenied = () => Object.assign(new Error('LOCATION_ACCESS_DENIED'), { code: 'LOCATION_ACCESS_DENIED' })
const duplicateSlug = (): LocationMutationResult => ({ ok: false, error: 'Please correct the highlighted fields.', fieldErrors: { slug: 'This slug is already used by another location.' } })

function auditActorRole(role: BusinessRole): Role {
  if (role === 'OWNER') return 'OWNER'
  if (role === 'ACCOUNTS') return 'ACCOUNTANT'
  return 'USER'
}

const defaultRepository: LocationManagementRepository = {
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
  findLocation: ({ businessId, locationId }) => prisma.location.findFirst({ where: { id: locationId, businessId }, select: { id: true, businessId: true } }),
  async isSlugTaken({ businessId, slug, excludeLocationId }) {
    return (await prisma.location.count({ where: { businessId, slug, ...(excludeLocationId ? { id: { not: excludeLocationId } } : {}) } })) > 0
  },
  create: ({ businessId, assignMembershipId, values }) => prisma.$transaction(async (tx) => {
    const location = await tx.location.create({ data: { businessId, ...values }, select: { id: true } })
    if (assignMembershipId) await tx.locationAssignment.create({ data: { membershipId: assignMembershipId, locationId: location.id } })
    return location
  }),
  async update({ businessId, locationId, values }) {
    const result = await prisma.location.updateMany({ where: { id: locationId, businessId }, data: values })
    if (result.count !== 1) throw locationDenied()
    return { id: locationId }
  },
  replaceHours: ({ businessId, locationId, hours }) => prisma.$transaction(async (tx) => {
    const exists = await tx.location.count({ where: { id: locationId, businessId } })
    if (exists !== 1) throw locationDenied()
    await tx.locationHours.deleteMany({ where: { locationId } })
    if (hours.length) await tx.locationHours.createMany({ data: hours.map((hour) => ({ locationId, ...hour })) })
    return { id: locationId }
  }),
  setActiveWithAudit: ({ businessId, actorId, locationId, active }) => prisma.$transaction(async (tx) => {
    const membership = await tx.businessMembership.findFirst({ where: { businessId, userId: actorId, active: true }, select: { role: true } })
    if (!membership || !['OWNER', 'MANAGER'].includes(membership.role)) throw businessDenied()
    const updated = await tx.location.updateMany({ where: { id: locationId, businessId }, data: { isActive: active } })
    if (updated.count !== 1) throw locationDenied()
    await tx.auditLog.create({
      data: {
        actorId,
        actorRole: auditActorRole(membership.role),
        action: active ? 'LOCATION_ACTIVATED' : 'LOCATION_DEACTIVATED',
        details: { businessId, locationId, active },
      },
    })
    return { id: locationId }
  }),
  async list({ businessId, locationIds }) {
    const rows = await prisma.location.findMany({
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
    const location = await repository.update({ businessId: input.businessId, locationId: input.locationId, values })
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
  const location = await repository.replaceHours({ businessId: input.businessId, locationId: input.locationId, hours: parsed.data })
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
