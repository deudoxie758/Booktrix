import { describe, expect, it } from 'vitest'
import { createPrismaBusinessSettingsRepository } from '@/modules/settings/business-policy'

const profileValues = { name: 'Island Glow Spa', slug: 'island-glow-spa', description: 'A calm neighborhood spa.', phone: '+1 758 555 0100', email: 'hello@islandglow.example' }
const policyValues = {
  currency: 'XCD', timezone: 'America/St_Lucia', defaultConfirmationMode: 'MANUAL' as const,
  minimumNoticeMinutes: 60, maximumAdvanceBookingDays: 90, defaultPreparationMinutes: 10, defaultCleanupMinutes: 10,
  cancellationNoticeHours: 24, reschedulingNoticeHours: 24, cancellationPolicyText: 'Cancel 24 hours ahead.',
}

/**
 * Exercises createPrismaBusinessSettingsRepository directly against a
 * fake Prisma client shaped like the real one (mirrors the pattern in
 * tests/locations/repository.test.ts) — unlike the domain-level fake
 * repository in business-policy.test.ts, this can actually catch a missing
 * production audit write, because it asserts against the concrete Prisma
 * wiring rather than a hand-written test double that fakes its own audits.
 */
function fixture() {
  const state = {
    business: { id: 'business-a', name: 'Island Glow', slug: 'island-glow', description: null as string | null, phone: null as string | null, email: null as string | null },
    policy: null as null | Record<string, unknown>,
    audits: [] as Array<{ actorId: string; actorRole: string; action: string; details: Record<string, unknown> }>,
    transactionCount: 0,
  }

  const transaction = {
    business: {
      async update({ where, data }: any) {
        if (where.id !== state.business.id) throw new Error('NOT_FOUND')
        state.business = { ...state.business, ...data }
        return { id: state.business.id, name: state.business.name, slug: state.business.slug, description: state.business.description, phone: state.business.phone, email: state.business.email }
      },
    },
    businessPolicy: {
      async upsert({ where, create, update }: any) {
        state.policy = state.policy && state.policy.businessId === where.businessId ? { ...state.policy, ...update } : { businessId: where.businessId, ...create }
        return state.policy
      },
    },
    auditLog: {
      async create({ data }: any) {
        state.audits.push(data)
        return data
      },
    },
  }

  const client = {
    business: { findUnique: async () => null },
    businessMembership: { findFirst: async () => ({ role: 'OWNER' }) },
    auditLog: { create: transaction.auditLog.create },
    async $transaction<T>(work: (tx: typeof transaction) => Promise<T>) {
      state.transactionCount += 1
      return work(transaction)
    },
  } as any

  return { state, repository: createPrismaBusinessSettingsRepository(client) }
}

describe('createPrismaBusinessSettingsRepository', () => {
  it('writes a BUSINESS_PROFILE_UPDATED audit row in the same transaction as the profile save', async () => {
    const { state, repository } = fixture()

    await repository.saveProfile({ actorId: 'owner-1', businessId: 'business-a', values: profileValues })

    expect(state.business.description).toBe(profileValues.description)
    expect(state.audits).toEqual([
      expect.objectContaining({ actorId: 'owner-1', actorRole: 'OWNER', action: 'BUSINESS_PROFILE_UPDATED', details: expect.objectContaining({ businessId: 'business-a', slug: profileValues.slug }) }),
    ])
    expect(state.transactionCount).toBe(1)
  })

  it('writes a BUSINESS_POLICY_UPDATED audit row in the same transaction as the policy save', async () => {
    const { state, repository } = fixture()

    await repository.savePolicy({ actorId: 'owner-1', businessId: 'business-a', values: policyValues })

    expect(state.policy).toEqual(expect.objectContaining({ businessId: 'business-a', defaultConfirmationMode: 'MANUAL' }))
    expect(state.audits).toEqual([
      expect.objectContaining({ actorId: 'owner-1', actorRole: 'OWNER', action: 'BUSINESS_POLICY_UPDATED', details: expect.objectContaining({ businessId: 'business-a', defaultConfirmationMode: 'MANUAL' }) }),
    ])
    expect(state.transactionCount).toBe(1)
  })

  it('exposes a standalone createAudit capability that persists a row', async () => {
    const { state, repository } = fixture()

    await repository.createAudit({ businessId: 'business-a', actorId: 'owner-1', action: 'BUSINESS_SETTINGS_VIEWED', details: { note: 'example' } })

    expect(state.audits).toEqual([
      expect.objectContaining({ actorId: 'owner-1', actorRole: 'OWNER', action: 'BUSINESS_SETTINGS_VIEWED', details: { businessId: 'business-a', note: 'example' } }),
    ])
  })
})
