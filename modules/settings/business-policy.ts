import { z } from 'zod'
import type { BusinessRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export const BUSINESS_CURRENCY = 'XCD'
export const BUSINESS_TIMEZONE = 'America/St_Lucia'

export const settingsError = (code: string) => Object.assign(new Error(code), { code })

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ValidationSuccess<T> = { ok: true; data: T }
export type ValidationFailure = { ok: false; error: string; fieldErrors: Record<string, string> }

function zodFieldErrors(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.')
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fieldErrors
}

export function normalizeBusinessSlug(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export type BusinessProfileInput = {
  name: string
  slug: string
  description?: string | null
  phone?: string | null
  email?: string | null
}

export type NormalizedBusinessProfile = {
  name: string
  slug: string
  description: string | null
  phone: string | null
  email: string | null
}

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Business name is required.').max(120, 'Business name must be 120 characters or fewer.'),
  slug: z.string().transform(normalizeBusinessSlug).pipe(z.string().min(1, 'Slug is required.').max(120, 'Slug must be 120 characters or fewer.')),
  description: z.string().trim().max(2000, 'Description must be 2000 characters or fewer.').optional().nullable().transform((value) => value || null),
  phone: z.string().trim().max(30, 'Phone must be 30 characters or fewer.').optional().nullable().transform((value) => value || null),
  email: z.string().trim().max(254, 'Email must be 254 characters or fewer.').optional().nullable().transform((value, context) => {
    if (!value) return null
    if (!z.string().email().safeParse(value).success) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid email address.' })
      return z.NEVER
    }
    return value.toLowerCase()
  }),
})

export function validateProfile(input: BusinessProfileInput): ValidationSuccess<NormalizedBusinessProfile> | ValidationFailure {
  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Please correct the highlighted fields.', fieldErrors: zodFieldErrors(parsed.error) }
  return { ok: true, data: parsed.data as NormalizedBusinessProfile }
}

export type BusinessPolicyInput = {
  currency: string
  timezone: string
  defaultConfirmationMode: 'AUTOMATIC' | 'MANUAL'
  minimumNoticeMinutes: number
  maximumAdvanceBookingDays: number
  defaultPreparationMinutes: number
  defaultCleanupMinutes: number
  cancellationNoticeHours: number
  reschedulingNoticeHours: number
  cancellationPolicyText?: string | null
}

export type NormalizedBusinessPolicy = BusinessPolicyInput & { cancellationPolicyText: string | null }

const policySchema = z.object({
  currency: z.literal(BUSINESS_CURRENCY, { errorMap: () => ({ message: `Currency must be ${BUSINESS_CURRENCY}.` }) }),
  timezone: z.literal(BUSINESS_TIMEZONE, { errorMap: () => ({ message: `Timezone must be ${BUSINESS_TIMEZONE}.` }) }),
  defaultConfirmationMode: z.enum(['AUTOMATIC', 'MANUAL']),
  minimumNoticeMinutes: z.number().int().min(0, 'Minimum notice cannot be negative.').max(10_080, 'Minimum notice must be 7 days or fewer.'),
  maximumAdvanceBookingDays: z.number().int().min(1, 'Maximum advance booking must be at least 1 day.').max(365, 'Maximum advance booking must be 365 days or fewer.'),
  defaultPreparationMinutes: z.number().int().min(0, 'Preparation buffer cannot be negative.').max(480, 'Preparation buffer must be 480 minutes or fewer.'),
  defaultCleanupMinutes: z.number().int().min(0, 'Cleanup buffer cannot be negative.').max(480, 'Cleanup buffer must be 480 minutes or fewer.'),
  cancellationNoticeHours: z.number().int().min(0, 'Cancellation notice cannot be negative.').max(720, 'Cancellation notice must be 720 hours or fewer.'),
  reschedulingNoticeHours: z.number().int().min(0, 'Rescheduling notice cannot be negative.').max(720, 'Rescheduling notice must be 720 hours or fewer.'),
  cancellationPolicyText: z.string().trim().max(5000, 'Cancellation policy text must be 5000 characters or fewer.').optional().nullable().transform((value) => value || null),
})

export function validatePolicy(input: BusinessPolicyInput): ValidationSuccess<NormalizedBusinessPolicy> | ValidationFailure {
  const parsed = policySchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Please correct the highlighted fields.', fieldErrors: zodFieldErrors(parsed.error) }
  return { ok: true, data: parsed.data as NormalizedBusinessPolicy }
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export type SettingsAuthorization = { businessId: string; role: BusinessRole }

export type BusinessProfileRecord = { id: string; name: string; slug: string; description: string | null; phone: string | null; email: string | null }
export type BusinessPolicyRecord = { businessId: string } & NormalizedBusinessPolicy

export type BusinessSettingsRepository = {
  authorize(input: { actorId: string; businessId: string }): Promise<SettingsAuthorization>
  isSlugTaken(input: { slug: string; excludeBusinessId: string }): Promise<boolean>
  saveProfile(input: { actorId: string; businessId: string; values: NormalizedBusinessProfile }): Promise<BusinessProfileRecord>
  savePolicy(input: { actorId: string; businessId: string; values: NormalizedBusinessPolicy }): Promise<BusinessPolicyRecord>
  /**
   * Mirrors PublicationReadinessTransaction.createAudit's shape. Exposed as
   * its own repository capability (matching the audited-mutation pattern
   * used across modules/locations/management.ts and
   * modules/finance/cash-collection.ts), even though the Prisma
   * implementation of saveProfile/savePolicy writes its own audit row
   * transactionally alongside the entity write rather than routing through
   * this method — see the comment on createPrismaBusinessSettingsRepository.
   */
  createAudit(input: { businessId: string; actorId: string; action: string; details: Record<string, unknown> }): Promise<void>
}

export type ProfileMutationResult = { ok: true; profile: BusinessProfileRecord } | { ok: false; error: string; fieldErrors?: Record<string, string> }
export type PolicyMutationResult = { ok: true; policy: BusinessPolicyRecord } | { ok: false; error: string; fieldErrors?: Record<string, string> }

const duplicateSlug = (): ProfileMutationResult => ({ ok: false, error: 'Please correct the highlighted fields.', fieldErrors: { slug: 'This slug is already used by another business.' } })

async function requireOwner(input: { actorId: string; businessId: string }, repository: BusinessSettingsRepository) {
  const authorization = await repository.authorize(input)
  if (authorization.businessId !== input.businessId || authorization.role !== 'OWNER') throw settingsError('SETTINGS_ACCESS_DENIED')
  return authorization
}

export async function saveBusinessProfile(
  input: { actorId: string; businessId: string; values: BusinessProfileInput },
  repository: BusinessSettingsRepository = defaultRepository,
): Promise<ProfileMutationResult> {
  await requireOwner(input, repository)
  const parsed = validateProfile(input.values)
  if (parsed.ok === false) return parsed
  if (await repository.isSlugTaken({ slug: parsed.data.slug, excludeBusinessId: input.businessId })) return duplicateSlug()
  try {
    const profile = await repository.saveProfile({ actorId: input.actorId, businessId: input.businessId, values: parsed.data })
    return { ok: true, profile }
  } catch (error) {
    if (isUniqueConstraint(error)) return duplicateSlug()
    throw error
  }
}

export async function saveBusinessPolicy(
  input: { actorId: string; businessId: string; values: BusinessPolicyInput },
  repository: BusinessSettingsRepository = defaultRepository,
): Promise<PolicyMutationResult> {
  await requireOwner(input, repository)
  const parsed = validatePolicy(input.values)
  if (parsed.ok === false) return parsed
  const policy = await repository.savePolicy({ actorId: input.actorId, businessId: input.businessId, values: parsed.data })
  return { ok: true, policy }
}

function isUniqueConstraint(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code: unknown }).code === 'P2002')
}

export function createPrismaBusinessSettingsRepository(client: typeof prisma): BusinessSettingsRepository {
  return {
    async authorize({ actorId, businessId }) {
      const membership = await client.businessMembership.findFirst({ where: { businessId, userId: actorId, active: true }, select: { role: true } })
      if (!membership) throw settingsError('SETTINGS_ACCESS_DENIED')
      return { businessId, role: membership.role }
    },
    async isSlugTaken({ slug, excludeBusinessId }) {
      const existing = await client.business.findUnique({ where: { slug }, select: { id: true } })
      return Boolean(existing && existing.id !== excludeBusinessId)
    },
    // Saves the profile and writes its BUSINESS_PROFILE_UPDATED audit row in
    // the same transaction (mirrors modules/locations/management.ts's
    // setActiveWithAudit) — the write and its audit evidence commit or roll
    // back together; there is never a persisted change without an audit row.
    saveProfile: ({ actorId, businessId, values }) => client.$transaction(async (transaction) => {
      const profile = await transaction.business.update({ where: { id: businessId }, data: values, select: { id: true, name: true, slug: true, description: true, phone: true, email: true } })
      await transaction.auditLog.create({ data: { actorId, actorRole: 'OWNER', action: 'BUSINESS_PROFILE_UPDATED', details: { businessId, ...values } } })
      return profile
    }),
    // A plain upsert of the single policy row — this never touches
    // ServiceOffering, BookingOrder, or BookingSegment tables, so existing
    // service confirmation modes, buffers, cancellation lead times, and
    // historical bookings are never rewritten by a new business-wide default.
    // The upsert and its BUSINESS_POLICY_UPDATED audit row are written in the
    // same transaction.
    savePolicy: ({ actorId, businessId, values }) => client.$transaction(async (transaction) => {
      const policy = await transaction.businessPolicy.upsert({ where: { businessId }, create: { businessId, ...values }, update: values })
      await transaction.auditLog.create({ data: { actorId, actorRole: 'OWNER', action: 'BUSINESS_POLICY_UPDATED', details: { businessId, ...values } } })
      return policy
    }),
    async createAudit({ businessId, actorId, action, details }) {
      await client.auditLog.create({ data: { actorId, actorRole: 'OWNER', action, details: { businessId, ...details } } })
    },
  }
}

const defaultRepository = createPrismaBusinessSettingsRepository(prisma)

export const DEFAULT_BUSINESS_POLICY: NormalizedBusinessPolicy = {
  currency: BUSINESS_CURRENCY,
  timezone: BUSINESS_TIMEZONE,
  defaultConfirmationMode: 'AUTOMATIC',
  minimumNoticeMinutes: 60,
  maximumAdvanceBookingDays: 90,
  defaultPreparationMinutes: 0,
  defaultCleanupMinutes: 0,
  cancellationNoticeHours: 24,
  reschedulingNoticeHours: 24,
  cancellationPolicyText: null,
}

/**
 * Read-only convenience for pages that already authorized the Owner actor
 * (e.g. via requireWorkspaceRole). Falls back to safe published defaults if
 * no row exists yet for this business — the forward-only backfill migration
 * covers every business that existed at migration time, but this keeps the
 * read defensive for a business created before its first policy save.
 */
export async function loadBusinessPolicy(businessId: string, client: typeof prisma = prisma): Promise<BusinessPolicyRecord> {
  const policy = await client.businessPolicy.findUnique({ where: { businessId } })
  if (policy) return policy
  return { businessId, ...DEFAULT_BUSINESS_POLICY }
}

// ---------------------------------------------------------------------------
// Staging payment/subscription status
// ---------------------------------------------------------------------------

export type IntegrationStagingStatus = {
  paymentProvider: { available: boolean; message: string }
  subscriptionBilling: { available: boolean; message: string }
}

/**
 * Deliberately static and independent of environment variables: even where a
 * provider credential is present, this phase does not simulate settlement,
 * subscription billing, commissions, refunds, or payouts (see the design
 * spec's "Deferred Work" section). Settings must show a truthful staging
 * status, never an editable control that implies live functionality.
 */
export function getIntegrationStagingStatus(): IntegrationStagingStatus {
  return {
    paymentProvider: {
      available: false,
      message: 'Online payment settlement is not available in this environment yet. Online payment requests remain visible as pending, and cash can still be recorded as collected in Finance.',
    },
    subscriptionBilling: {
      available: false,
      message: 'Platform subscription billing is not available yet. No subscription charges or commissions are applied to this business.',
    },
  }
}
