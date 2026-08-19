import type { BusinessRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { settingsError } from './business-policy'

// ---------------------------------------------------------------------------
// Pure readiness evaluation
// ---------------------------------------------------------------------------

export type ReadinessLocation = { id: string; name: string; hasHours: boolean }
export type ReadinessService = { id: string; name: string }

export type PublicationReadinessInput = {
  business: { status: string }
  activeLocations: ReadinessLocation[]
  activeServices: ReadinessService[]
  qualifiedStaff: number
  policy?: { cancellationPolicyText: string | null } | null
}

export type PublicationBlocker = { code: string; message: string; href: string }
export type PublicationReadiness = { ready: boolean; blockers: PublicationBlocker[] }

/**
 * Evaluates real, current storefront data — never a rubber-stamp flag.
 * Every blocker reflects a genuinely missing prerequisite and links to where
 * an Owner can fix it (either an external workspace page or the relevant
 * Settings tab).
 */
export function evaluatePublicationReadiness(input: PublicationReadinessInput): PublicationReadiness {
  const blockers: PublicationBlocker[] = []

  if (input.activeLocations.length === 0) {
    blockers.push({ code: 'NO_ACTIVE_LOCATION', message: 'Add an active location', href: '/business/locations' })
  } else {
    for (const location of input.activeLocations) {
      if (!location.hasHours) blockers.push({ code: 'MISSING_HOURS', message: `Set opening hours for ${location.name}.`, href: '/business/locations' })
    }
  }

  if (input.activeServices.length === 0) {
    blockers.push({ code: 'NO_ACTIVE_SERVICE', message: 'Add an active service', href: '/business/services' })
  }

  if (input.qualifiedStaff <= 0) {
    blockers.push({ code: 'NO_QUALIFIED_STAFF', message: 'Assign a qualified staff member to an active service', href: '/business/team' })
  }

  if (input.policy && !input.policy.cancellationPolicyText?.trim()) {
    blockers.push({ code: 'MISSING_CANCELLATION_POLICY', message: 'Add your cancellation and rescheduling policy text', href: '#policy' })
  }

  return { ready: blockers.length === 0, blockers }
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export type SettingsAuthorization = { businessId: string; role: BusinessRole }

export type ReadinessFacts = {
  businessStatus: string
  activeLocations: ReadinessLocation[]
  activeServices: ReadinessService[]
  qualifiedStaffCount: number
  cancellationPolicyText: string | null
}

export type PublicationReadinessTransaction = {
  loadReadinessFacts(input: { businessId: string }): Promise<ReadinessFacts>
  updateStatus(input: { businessId: string; status: 'PUBLISHED' | 'SETUP' }): Promise<void>
  createAudit(input: { businessId: string; actorId: string; action: string; details: Record<string, unknown> }): Promise<void>
}

export type PublicationReadinessRepository = {
  authorize(input: { actorId: string; businessId: string }): Promise<SettingsAuthorization>
  loadReadinessFacts(input: { businessId: string }): Promise<ReadinessFacts>
  transaction<T>(work: (transaction: PublicationReadinessTransaction) => Promise<T>): Promise<T>
}

function toReadinessInput(facts: ReadinessFacts): PublicationReadinessInput {
  return {
    business: { status: facts.businessStatus },
    activeLocations: facts.activeLocations,
    activeServices: facts.activeServices,
    qualifiedStaff: facts.qualifiedStaffCount,
    policy: { cancellationPolicyText: facts.cancellationPolicyText },
  }
}

async function requireOwner(input: { actorId: string; businessId: string }, repository: PublicationReadinessRepository) {
  const authorization = await repository.authorize(input)
  if (authorization.businessId !== input.businessId || authorization.role !== 'OWNER') throw settingsError('SETTINGS_ACCESS_DENIED')
  return authorization
}

/**
 * Statuses an Owner may self-service toggle from Settings. Every other
 * BusinessStatus (application review, approval, suspension, archival) is
 * platform-admin controlled elsewhere and is intentionally locked here.
 */
const OWNER_TOGGLEABLE_STATUSES = new Set(['SETUP', 'PUBLISHED'])

export type SetPublicationStatusResult = { status: 'PUBLISHED' | 'SETUP'; blockers: PublicationBlocker[] }

export async function setPublicationStatus(
  input: { actorId: string; businessId: string; publish: boolean },
  repository: PublicationReadinessRepository = defaultRepository,
): Promise<SetPublicationStatusResult> {
  await requireOwner(input, repository)
  return repository.transaction(async (transaction) => {
    // Readiness is recomputed here, inside the mutation, from facts reloaded
    // in this same transaction — a caller cannot bypass validation by
    // claiming readiness up front.
    const facts = await transaction.loadReadinessFacts({ businessId: input.businessId })
    if (!OWNER_TOGGLEABLE_STATUSES.has(facts.businessStatus)) throw settingsError('PUBLICATION_STATUS_LOCKED')
    const readiness = evaluatePublicationReadiness(toReadinessInput(facts))

    if (input.publish) {
      if (!readiness.ready) throw Object.assign(settingsError('PUBLICATION_NOT_READY'), { blockers: readiness.blockers })
      await transaction.updateStatus({ businessId: input.businessId, status: 'PUBLISHED' })
      await transaction.createAudit({ businessId: input.businessId, actorId: input.actorId, action: 'BUSINESS_PUBLISHED', details: {} })
      return { status: 'PUBLISHED' as const, blockers: [] }
    }

    // Unpublishing only ever moves the business back to SETUP. It never
    // deletes locations, services, team assignments, or bookings — those
    // remain fully intact storefront and operational history.
    await transaction.updateStatus({ businessId: input.businessId, status: 'SETUP' })
    await transaction.createAudit({ businessId: input.businessId, actorId: input.actorId, action: 'BUSINESS_UNPUBLISHED', details: {} })
    return { status: 'SETUP' as const, blockers: readiness.blockers }
  })
}

export type PublicationReadinessView = { status: string; ready: boolean; blockers: PublicationBlocker[] }

export async function getPublicationReadiness(
  input: { actorId: string; businessId: string },
  repository: PublicationReadinessRepository = defaultRepository,
): Promise<PublicationReadinessView> {
  await requireOwner(input, repository)
  const facts = await repository.loadReadinessFacts({ businessId: input.businessId })
  const readiness = evaluatePublicationReadiness(toReadinessInput(facts))
  return { status: facts.businessStatus, ready: readiness.ready, blockers: readiness.blockers }
}

// ---------------------------------------------------------------------------
// Prisma wiring
// ---------------------------------------------------------------------------

async function loadReadinessFactsFromPrisma(client: typeof prisma, businessId: string): Promise<ReadinessFacts> {
  const [business, locations, services, qualifiedStaffCount, policy] = await Promise.all([
    client.business.findUniqueOrThrow({ where: { id: businessId }, select: { status: true } }),
    client.location.findMany({ where: { businessId, isActive: true }, select: { id: true, name: true, _count: { select: { Hours: true } } } }),
    client.serviceOffering.findMany({ where: { businessId, active: true }, select: { id: true, name: true } }),
    client.staffQualification.count({ where: { active: true, membership: { businessId, active: true, role: 'STAFF' }, offering: { businessId, active: true }, location: { businessId, isActive: true } } }),
    client.businessPolicy.findUnique({ where: { businessId }, select: { cancellationPolicyText: true } }),
  ])
  return {
    businessStatus: business.status,
    activeLocations: locations.map((location) => ({ id: location.id, name: location.name, hasHours: location._count.Hours > 0 })),
    activeServices: services,
    qualifiedStaffCount,
    cancellationPolicyText: policy?.cancellationPolicyText ?? null,
  }
}

export function createPrismaPublicationReadinessRepository(client: typeof prisma): PublicationReadinessRepository {
  return {
    async authorize({ actorId, businessId }) {
      const membership = await client.businessMembership.findFirst({ where: { businessId, userId: actorId, active: true }, select: { role: true } })
      if (!membership) throw settingsError('SETTINGS_ACCESS_DENIED')
      return { businessId, role: membership.role }
    },
    loadReadinessFacts: ({ businessId }) => loadReadinessFactsFromPrisma(client, businessId),
    transaction(work) {
      return client.$transaction(async (transaction) => work({
        loadReadinessFacts: ({ businessId }) => loadReadinessFactsFromPrisma(transaction as unknown as typeof prisma, businessId),
        async updateStatus({ businessId, status }) {
          await transaction.business.update({ where: { id: businessId }, data: { status } })
        },
        async createAudit({ businessId, actorId, action, details }) {
          await transaction.auditLog.create({ data: { actorId, actorRole: 'OWNER', action, details: { businessId, ...details } } })
        },
      }))
    },
  }
}

const defaultRepository = createPrismaPublicationReadinessRepository(prisma)
