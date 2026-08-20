import { describe, expect, it } from 'vitest'
import {
  evaluatePublicationReadiness,
  getPublicationReadiness,
  setPublicationStatus,
  type PublicationReadinessRepository,
} from '@/modules/settings/publication-readiness'

const readyFacts = {
  businessStatus: 'SETUP',
  activeLocations: [{ id: 'loc-1', name: 'Castries', hasHours: true }],
  activeServices: [{ id: 'svc-1', name: 'Glow facial' }],
  qualifiedStaffCount: 1,
  cancellationPolicyText: 'Cancel 24 hours ahead for a full refund.',
}

describe('evaluatePublicationReadiness', () => {
  it('blocks publication with no active locations, services, or qualified staff', () => {
    const result = evaluatePublicationReadiness({ business: { status: 'SETUP' }, activeLocations: [], activeServices: [], qualifiedStaff: 0 })
    expect(result.ready).toBe(false)
    expect(result.blockers.map((blocker) => blocker.message)).toContain('Add an active location')
  })

  it('blocks publication when an active location is missing opening hours', () => {
    const result = evaluatePublicationReadiness({
      business: { status: 'SETUP' },
      activeLocations: [{ id: 'loc-1', name: 'Castries', hasHours: false }],
      activeServices: [{ id: 'svc-1', name: 'Glow facial' }],
      qualifiedStaff: 1,
    })
    expect(result.ready).toBe(false)
    expect(result.blockers.some((blocker) => blocker.message.includes('Castries'))).toBe(true)
  })

  it('blocks publication with no active services', () => {
    const result = evaluatePublicationReadiness({ business: { status: 'SETUP' }, activeLocations: [{ id: 'loc-1', name: 'Castries', hasHours: true }], activeServices: [], qualifiedStaff: 1 })
    expect(result.ready).toBe(false)
    expect(result.blockers.map((blocker) => blocker.message)).toContain('Add an active service')
  })

  it('blocks publication with no qualified active staff', () => {
    const result = evaluatePublicationReadiness({ business: { status: 'SETUP' }, activeLocations: [{ id: 'loc-1', name: 'Castries', hasHours: true }], activeServices: [{ id: 'svc-1', name: 'Glow facial' }], qualifiedStaff: 0 })
    expect(result.ready).toBe(false)
    expect(result.blockers.some((blocker) => /qualified staff/i.test(blocker.message))).toBe(true)
  })

  it('blocks publication when cancellation policy text is missing', () => {
    const result = evaluatePublicationReadiness({
      business: { status: 'SETUP' },
      activeLocations: [{ id: 'loc-1', name: 'Castries', hasHours: true }],
      activeServices: [{ id: 'svc-1', name: 'Glow facial' }],
      qualifiedStaff: 1,
      policy: { cancellationPolicyText: '  ' },
    })
    expect(result.ready).toBe(false)
    expect(result.blockers.some((blocker) => /cancellation/i.test(blocker.message))).toBe(true)
  })

  it('is ready when every real requirement is satisfied', () => {
    const result = evaluatePublicationReadiness({
      business: { status: 'SETUP' },
      activeLocations: [{ id: 'loc-1', name: 'Castries', hasHours: true }],
      activeServices: [{ id: 'svc-1', name: 'Glow facial' }],
      qualifiedStaff: 1,
      policy: { cancellationPolicyText: 'Cancel 24 hours ahead.' },
    })
    expect(result).toEqual({ ready: true, blockers: [] })
  })
})

function fixture(initialStatus: string = 'SETUP') {
  const state = {
    businessStatus: initialStatus,
    facts: readyFacts,
    audits: [] as Array<{ businessId: string; actorId: string; action: string }>,
    // Storefront history that must survive an unpublish — never deleted.
    locations: [{ id: 'loc-1', name: 'Castries' }],
    services: [{ id: 'svc-1', name: 'Glow facial' }],
  }

  const repository: PublicationReadinessRepository = {
    async authorize({ actorId, businessId }) {
      if (actorId === 'owner-a') return { businessId, role: 'OWNER' }
      if (actorId === 'manager-a') return { businessId, role: 'MANAGER' }
      throw Object.assign(new Error('SETTINGS_ACCESS_DENIED'), { code: 'SETTINGS_ACCESS_DENIED' })
    },
    async loadReadinessFacts() {
      return { ...state.facts, businessStatus: state.businessStatus }
    },
    async transaction(work) {
      return work({
        loadReadinessFacts: async () => ({ ...state.facts, businessStatus: state.businessStatus }),
        updateStatus: async ({ status }) => { state.businessStatus = status },
        createAudit: async (input) => { state.audits.push(input) },
      })
    },
  }

  return { repository, state }
}

describe('setPublicationStatus', () => {
  it('is Owner-only', async () => {
    const { repository } = fixture()
    await expect(setPublicationStatus({ actorId: 'manager-a', businessId: 'business-a', publish: true }, repository)).rejects.toThrow('SETTINGS_ACCESS_DENIED')
  })

  it('recomputes readiness inside the mutation and refuses to publish when blockers remain, even if the caller believes it is ready', async () => {
    const { repository, state } = fixture()
    state.facts = { ...readyFacts, activeLocations: [] }

    await expect(setPublicationStatus({ actorId: 'owner-a', businessId: 'business-a', publish: true }, repository)).rejects.toThrow('PUBLICATION_NOT_READY')
    expect(state.businessStatus).toBe('SETUP')
  })

  it('publishes only once every real readiness requirement is met', async () => {
    const { repository, state } = fixture()
    const result = await setPublicationStatus({ actorId: 'owner-a', businessId: 'business-a', publish: true }, repository)

    expect(result.status).toBe('PUBLISHED')
    expect(state.businessStatus).toBe('PUBLISHED')
    expect(state.audits).toEqual(expect.arrayContaining([expect.objectContaining({ action: 'BUSINESS_PUBLISHED' })]))
  })

  it('unpublishes without deleting storefront history', async () => {
    const { repository, state } = fixture('PUBLISHED')
    const result = await setPublicationStatus({ actorId: 'owner-a', businessId: 'business-a', publish: false }, repository)

    expect(result.status).toBe('SETUP')
    expect(state.businessStatus).toBe('SETUP')
    expect(state.locations).toEqual([{ id: 'loc-1', name: 'Castries' }])
    expect(state.services).toEqual([{ id: 'svc-1', name: 'Glow facial' }])
    expect(state.audits).toEqual(expect.arrayContaining([expect.objectContaining({ action: 'BUSINESS_UNPUBLISHED' })]))
  })

  it('refuses to toggle publication for a business outside owner-controllable statuses', async () => {
    const { repository } = fixture('UNDER_REVIEW')
    await expect(setPublicationStatus({ actorId: 'owner-a', businessId: 'business-a', publish: true }, repository)).rejects.toThrow('PUBLICATION_STATUS_LOCKED')
  })
})

describe('getPublicationReadiness', () => {
  it('is Owner-only and reports current blockers without mutating state', async () => {
    const { repository, state } = fixture()
    state.facts = { ...readyFacts, qualifiedStaffCount: 0 }

    const result = await getPublicationReadiness({ actorId: 'owner-a', businessId: 'business-a' }, repository)

    expect(result.status).toBe('SETUP')
    expect(result.ready).toBe(false)
    expect(state.businessStatus).toBe('SETUP')
    await expect(getPublicationReadiness({ actorId: 'manager-a', businessId: 'business-a' }, repository)).rejects.toThrow('SETTINGS_ACCESS_DENIED')
  })
})
