import { describe, expect, it } from 'vitest'
import { updateMemberAccess, type TeamManagementRepository } from '@/modules/team/management'

type Role = 'OWNER' | 'MANAGER' | 'ACCOUNTS' | 'STAFF'
type Qualification = { offeringId: string; locationId: string }

function fixture() {
  const state = {
    actors: new Map([
      ['owner', { membershipId: 'owner-membership', businessId: 'business-a', role: 'OWNER' as Role, active: true, assignedLocationIds: [] }],
      ['manager', { membershipId: 'manager-membership', businessId: 'business-a', role: 'MANAGER' as Role, active: true, assignedLocationIds: ['castries'] }],
    ]),
    members: new Map([
      ['owner-membership', { id: 'owner-membership', businessId: 'business-a', userId: 'owner', role: 'OWNER' as Role, active: true, locationIds: [], qualifications: [] as Qualification[] }],
      ['manager-membership', { id: 'manager-membership', businessId: 'business-a', userId: 'manager', role: 'MANAGER' as Role, active: true, locationIds: ['castries'], qualifications: [] as Qualification[] }],
      ['staff-membership', { id: 'staff-membership', businessId: 'business-a', userId: 'staff', role: 'STAFF' as Role, active: true, locationIds: ['castries'], qualifications: [{ offeringId: 'facial', locationId: 'castries' }] }],
      ['accounts-membership', { id: 'accounts-membership', businessId: 'business-a', userId: 'accounts', role: 'ACCOUNTS' as Role, active: true, locationIds: ['castries'], qualifications: [] as Qualification[] }],
      ['foreign-staff', { id: 'foreign-staff', businessId: 'business-b', userId: 'foreign', role: 'STAFF' as Role, active: true, locationIds: ['foreign-location'], qualifications: [] as Qualification[] }],
    ]),
    locations: new Map([
      ['castries', { businessId: 'business-a', active: true }],
      ['soufriere', { businessId: 'business-a', active: true }],
      ['foreign-location', { businessId: 'business-b', active: true }],
    ]),
    qualificationTargets: new Set(['business-a:facial:castries', 'business-a:massage:soufriere']),
    audits: [] as Array<{ action: string; actorId: string; businessId: string; details: Record<string, unknown> }>,
    beforeTransaction: undefined as undefined | (() => void),
    isolationLevels: [] as Array<string | undefined>,
  }

  const transaction = {
    async getActorAccess({ actorId, businessId }: any) {
      const actor = state.actors.get(actorId)
      return actor?.active && actor.businessId === businessId ? actor : null
    },
    async getMember({ businessId, membershipId }: any) {
      const member = state.members.get(membershipId)
      return member?.businessId === businessId ? { ...member, locationIds: [...member.locationIds], qualifications: member.qualifications.map((item) => ({ ...item })) } : null
    },
    async countActiveOwners({ businessId }: any) {
      return Array.from(state.members.values()).filter((member) => member.businessId === businessId && member.role === 'OWNER' && member.active).length
    },
    async loadValidScope({ businessId, locationIds, qualifications }: any) {
      return {
        locationIds: locationIds.filter((locationId: string) => {
          const location = state.locations.get(locationId)
          return location?.businessId === businessId && location.active
        }),
        qualificationKeys: qualifications.filter((qualification: Qualification) => state.qualificationTargets.has(`${businessId}:${qualification.offeringId}:${qualification.locationId}`)).map((qualification: Qualification) => `${qualification.offeringId}:${qualification.locationId}`),
      }
    },
    async setMemberAccess({ membershipId, role, active, locationIds, qualifications, preserveScope }: any) {
      const member = state.members.get(membershipId)!
      member.role = role
      member.active = active
      if (!preserveScope) {
        member.locationIds = [...locationIds]
        member.qualifications = qualifications.map((qualification: Qualification) => ({ ...qualification }))
      }
      return { ...member, locationIds: [...member.locationIds], qualifications: member.qualifications.map((item) => ({ ...item })) }
    },
    async createAudit(data: any) {
      state.audits.push(data)
    },
  }

  const repository: TeamManagementRepository = {
    async transaction(work, options) {
      state.isolationLevels.push(options?.isolationLevel)
      state.beforeTransaction?.()
      state.beforeTransaction = undefined
      return work(transaction)
    },
  }
  return { state, repository }
}

const staffUpdate = {
  actorId: 'owner',
  businessId: 'business-a',
  membershipId: 'staff-membership',
  role: 'STAFF' as const,
  active: true,
  locationIds: ['castries'],
  qualifications: [{ offeringId: 'facial', locationId: 'castries' }],
}

describe('team member access management', () => {
  it('lets a Manager update Staff access transactionally with audit evidence', async () => {
    const { state, repository } = fixture()

    const result = await updateMemberAccess({ ...staffUpdate, actorId: 'manager', qualifications: [] }, repository)

    expect(result).toEqual({ ok: true, membershipId: 'staff-membership' })
    expect(state.members.get('staff-membership')).toMatchObject({ role: 'STAFF', active: true, locationIds: ['castries'], qualifications: [] })
    expect(state.audits.map(({ action }) => action)).toEqual(['TEAM_MEMBER_ACCESS_UPDATED'])
    expect(state.isolationLevels).toEqual(['Serializable'])
  })

  it.each([
    ['manager-membership', 'MANAGER'],
    ['accounts-membership', 'ACCOUNTS'],
    ['owner-membership', 'OWNER'],
  ] as const)('prevents a Manager from managing a %s target', async (membershipId, role) => {
    const { repository } = fixture()
    await expect(updateMemberAccess({ ...staffUpdate, actorId: 'manager', membershipId, role, qualifications: [] }, repository)).rejects.toThrow('TEAM_ROLE_DENIED')
  })

  it('prevents a Manager from promoting Staff', async () => {
    const { repository } = fixture()
    await expect(updateMemberAccess({ ...staffUpdate, actorId: 'manager', role: 'MANAGER', qualifications: [] }, repository)).rejects.toThrow('TEAM_ROLE_DENIED')
  })

  it('rejects foreign-business members, locations, and offerings', async () => {
    const { repository } = fixture()

    await expect(updateMemberAccess({ ...staffUpdate, membershipId: 'foreign-staff', qualifications: [] }, repository)).rejects.toThrow('TEAM_MEMBER_NOT_FOUND')
    await expect(updateMemberAccess({ ...staffUpdate, locationIds: ['foreign-location'], qualifications: [] }, repository)).rejects.toThrow('TEAM_LOCATION_DENIED')
    await expect(updateMemberAccess({ ...staffUpdate, qualifications: [{ offeringId: 'foreign-offering', locationId: 'castries' }] }, repository)).rejects.toThrow('TEAM_QUALIFICATION_DENIED')
  })

  it('protects the last active Owner from deactivation or demotion', async () => {
    const { repository } = fixture()

    await expect(updateMemberAccess({ ...staffUpdate, membershipId: 'owner-membership', role: 'OWNER', active: false, locationIds: [], qualifications: [] }, repository)).rejects.toThrow('LAST_OWNER_PROTECTED')
    await expect(updateMemberAccess({ ...staffUpdate, membershipId: 'owner-membership', role: 'MANAGER', active: true, locationIds: [], qualifications: [] }, repository)).rejects.toThrow('LAST_OWNER_PROTECTED')
  })

  it('allows an Owner to demote another Owner only when an active Owner remains', async () => {
    const { state, repository } = fixture()
    state.members.set('second-owner', { id: 'second-owner', businessId: 'business-a', userId: 'second-owner-user', role: 'OWNER', active: true, locationIds: [], qualifications: [] })

    const result = await updateMemberAccess({ ...staffUpdate, membershipId: 'second-owner', role: 'MANAGER', locationIds: ['castries'], qualifications: [] }, repository)

    expect(result).toEqual({ ok: true, membershipId: 'second-owner' })
    expect(state.members.get('second-owner')).toMatchObject({ role: 'MANAGER', active: true })
  })

  it('does not treat an inactive former Owner as the last active Owner', async () => {
    const { state, repository } = fixture()
    state.members.set('inactive-owner', { id: 'inactive-owner', businessId: 'business-a', userId: 'inactive-owner-user', role: 'OWNER', active: false, locationIds: [], qualifications: [] })

    const result = await updateMemberAccess({ ...staffUpdate, membershipId: 'inactive-owner', role: 'MANAGER', active: true, locationIds: ['castries'], qualifications: [] }, repository)

    expect(result).toEqual({ ok: true, membershipId: 'inactive-owner' })
    expect(state.members.get('owner-membership')).toMatchObject({ role: 'OWNER', active: true })
  })

  it('deactivates a member without deleting historical assignments or qualifications', async () => {
    const { state, repository } = fixture()

    await updateMemberAccess({ ...staffUpdate, active: false, locationIds: [], qualifications: [] }, repository)

    expect(state.members.get('staff-membership')).toMatchObject({ active: false, locationIds: ['castries'], qualifications: [{ offeringId: 'facial', locationId: 'castries' }] })
  })

  it('rechecks Manager role and assignment inside the write transaction', async () => {
    const { state, repository } = fixture()
    state.beforeTransaction = () => { state.actors.get('manager')!.assignedLocationIds = [] }

    await expect(updateMemberAccess({ ...staffUpdate, actorId: 'manager', qualifications: [] }, repository)).rejects.toThrow('TEAM_LOCATION_DENIED')
    expect(state.members.get('staff-membership')).toMatchObject({ active: true, locationIds: ['castries'] })
    expect(state.audits).toEqual([])
  })

  it('prevents a Manager from rewriting or deactivating Staff with current out-of-scope access', async () => {
    const { state, repository } = fixture()
    state.members.get('staff-membership')!.locationIds = ['castries', 'soufriere']

    await expect(updateMemberAccess({ ...staffUpdate, actorId: 'manager', active: false, locationIds: [], qualifications: [] }, repository)).rejects.toThrow('TEAM_LOCATION_DENIED')
    expect(state.members.get('staff-membership')).toMatchObject({ active: true, locationIds: ['castries', 'soufriere'] })
  })
})
