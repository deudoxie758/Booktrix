import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  acceptInvitation,
  createInvitation,
  resendInvitation,
  revokeInvitation,
  type InvitationRepository,
} from '@/modules/team/invitations'

const dayOne = new Date('2026-08-19T12:00:00.000Z')
const dayTwo = new Date('2026-08-20T12:00:00.000Z')
const dayEight = new Date('2026-08-27T12:00:00.001Z')
const sevenDaysAfter = (value: Date) => new Date(value.getTime() + 7 * 24 * 60 * 60 * 1000)

type Role = 'OWNER' | 'MANAGER' | 'ACCOUNTS' | 'STAFF'
type Qualification = { offeringId: string; locationId: string }
type Invitation = {
  id: string
  businessId: string
  normalizedEmail: string
  invitedName: string
  role: Role
  tokenHash: string
  expiresAt: Date
  acceptedAt: Date | null
  revokedAt: Date | null
  inviterId: string
  activeKey: string | null
  locationIds: string[]
  qualifications: Qualification[]
}

function fixture() {
  const state = {
    actors: new Map([
      ['owner', { membershipId: 'owner-membership', businessId: 'business-a', role: 'OWNER' as Role, active: true, assignedLocationIds: [] }],
      ['manager', { membershipId: 'manager-membership', businessId: 'business-a', role: 'MANAGER' as Role, active: true, assignedLocationIds: ['castries'] }],
      ['owner-b', { membershipId: 'owner-b-membership', businessId: 'business-b', role: 'OWNER' as Role, active: true, assignedLocationIds: [] }],
    ]),
    users: new Map([
      ['owner', { id: 'owner', email: 'owner@example.com' }],
      ['manager', { id: 'manager', email: 'manager@example.com' }],
      ['invitee', { id: 'invitee', email: 'person@example.com' }],
      ['other-user', { id: 'other-user', email: 'other@example.com' }],
    ]),
    locations: new Map([
      ['castries', { businessId: 'business-a', active: true }],
      ['soufriere', { businessId: 'business-a', active: true }],
      ['foreign-location', { businessId: 'business-b', active: true }],
    ]),
    qualificationTargets: new Set(['business-a:facial:castries', 'business-a:massage:soufriere']),
    invitations: new Map<string, Invitation>(),
    memberships: new Map<string, { id: string; businessId: string; userId: string; role: Role; active: boolean; locationIds: string[]; qualifications: Qualification[] }>(),
    audits: [] as Array<{ action: string; actorId: string; businessId: string; details: Record<string, unknown> }>,
    nextInvitation: 1,
    nextMembership: 1,
    beforeTransaction: undefined as undefined | (() => void),
    isolationLevels: [] as Array<string | undefined>,
  }

  const transaction = {
    async getActorAccess({ actorId, businessId }: any) {
      const actor = state.actors.get(actorId)
      return actor?.active && actor.businessId === businessId ? actor : null
    },
    async findMembershipByEmail({ businessId, normalizedEmail }: any) {
      const user = Array.from(state.users.values()).find((candidate) => candidate.email.trim().toLowerCase() === normalizedEmail)
      return user ? state.memberships.get(`${businessId}:${user.id}`) ?? null : null
    },
    async findPendingByEmail({ businessId, normalizedEmail }: any) {
      return Array.from(state.invitations.values()).find((invitation) => invitation.businessId === businessId && invitation.normalizedEmail === normalizedEmail && !invitation.acceptedAt && !invitation.revokedAt) ?? null
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
    async closeExpiredInvitation({ invitationId, now }: any) {
      const invitation = state.invitations.get(invitationId)!
      invitation.revokedAt = now
      invitation.activeKey = null
    },
    async createInvitation(data: any) {
      const invitation: Invitation = { id: `invitation-${state.nextInvitation++}`, acceptedAt: null, revokedAt: null, ...data }
      state.invitations.set(invitation.id, invitation)
      return invitation
    },
    async getInvitationById({ invitationId }: any) {
      return state.invitations.get(invitationId) ?? null
    },
    async getInvitationByTokenHash({ tokenHash }: any) {
      return Array.from(state.invitations.values()).find((invitation) => invitation.tokenHash === tokenHash) ?? null
    },
    async rotateInvitation({ invitationId, tokenHash, expiresAt }: any) {
      const invitation = state.invitations.get(invitationId)!
      invitation.tokenHash = tokenHash
      invitation.expiresAt = expiresAt
      return invitation
    },
    async revokeInvitation({ invitationId, now }: any) {
      const invitation = state.invitations.get(invitationId)!
      invitation.revokedAt = now
      invitation.activeKey = null
      return invitation
    },
    async findUser({ actorId }: any) {
      return state.users.get(actorId) ?? null
    },
    async findMembership({ businessId, userId }: any) {
      return state.memberships.get(`${businessId}:${userId}`) ?? null
    },
    async createOrReactivateMembership({ businessId, userId, role }: any) {
      const key = `${businessId}:${userId}`
      const existing = state.memberships.get(key)
      if (existing) {
        existing.role = role
        existing.active = true
        return existing
      }
      const membership = { id: `membership-${state.nextMembership++}`, businessId, userId, role, active: true, locationIds: [], qualifications: [] }
      state.memberships.set(key, membership)
      return membership
    },
    async replaceMemberScope({ membershipId, locationIds, qualifications }: any) {
      const membership = Array.from(state.memberships.values()).find((candidate) => candidate.id === membershipId)!
      membership.locationIds = [...locationIds]
      membership.qualifications = qualifications.map((qualification: Qualification) => ({ ...qualification }))
    },
    async markAccepted({ invitationId, now }: any) {
      const invitation = state.invitations.get(invitationId)!
      if (invitation.acceptedAt || invitation.revokedAt) return false
      invitation.acceptedAt = now
      invitation.activeKey = null
      return true
    },
    async createAudit(data: any) {
      state.audits.push(data)
    },
  }

  const repository: InvitationRepository = {
    async transaction(work, options) {
      state.isolationLevels.push(options?.isolationLevel)
      state.beforeTransaction?.()
      state.beforeTransaction = undefined
      return work(transaction)
    },
  }
  return { state, repository }
}

const staffInput = {
  actorId: 'owner',
  businessId: 'business-a',
  name: '  Person Example  ',
  email: '  Person@Example.COM ',
  role: 'STAFF' as const,
  locationIds: ['castries'],
  qualifications: [{ offeringId: 'facial', locationId: 'castries' }],
}

describe('business invitation lifecycle', () => {
  it('returns a one-time random token while persisting only its SHA-256 hash for seven days', async () => {
    const { state, repository } = fixture()

    const created = await createInvitation({ ...staffInput, now: dayOne }, repository)

    expect(created.token).toMatch(/^[a-f0-9]{64}$/)
    expect(created.expiresAt).toEqual(sevenDaysAfter(dayOne))
    const persisted = state.invitations.get(created.id)!
    expect(persisted.normalizedEmail).toBe('person@example.com')
    expect(persisted.invitedName).toBe('Person Example')
    expect(persisted.tokenHash).toBe(createHash('sha256').update(created.token).digest('hex'))
    expect(persisted).not.toHaveProperty('token')
    expect(state.audits.map(({ action }) => action)).toEqual(['TEAM_INVITATION_CREATED'])
    expect(state.isolationLevels).toEqual(['Serializable'])
  })

  it('allows Managers to invite Staff only within their assigned locations', async () => {
    const { repository } = fixture()

    await expect(createInvitation({ ...staffInput, actorId: 'manager', role: 'STAFF', now: dayOne }, repository)).resolves.toMatchObject({ email: 'person@example.com' })
    await expect(createInvitation({ ...staffInput, actorId: 'manager', role: 'MANAGER', now: dayOne }, repository)).rejects.toThrow('INVITATION_ROLE_DENIED')
    await expect(createInvitation({ ...staffInput, actorId: 'manager', locationIds: ['soufriere'], qualifications: [], now: dayOne }, repository)).rejects.toThrow('INVITATION_LOCATION_DENIED')
  })

  it('prevents Managers from revoking Staff invitations outside their current location scope', async () => {
    const { repository } = fixture()
    const invitation = await createInvitation({ ...staffInput, locationIds: ['soufriere'], qualifications: [], now: dayOne }, repository)

    await expect(revokeInvitation({ actorId: 'manager', businessId: 'business-a', invitationId: invitation.id, now: dayTwo }, repository)).rejects.toThrow('INVITATION_LOCATION_DENIED')
  })

  it('rejects cross-business locations and service qualifications', async () => {
    const { state, repository } = fixture()

    await expect(createInvitation({ ...staffInput, locationIds: ['foreign-location'], qualifications: [], now: dayOne }, repository)).rejects.toThrow('INVITATION_LOCATION_DENIED')
    await expect(createInvitation({ ...staffInput, qualifications: [{ offeringId: 'foreign-offering', locationId: 'castries' }], now: dayOne }, repository)).rejects.toThrow('INVITATION_QUALIFICATION_DENIED')
    expect(state.invitations.size).toBe(0)
  })

  it('rotates the token and extends expiry when resending', async () => {
    const { state, repository } = fixture()
    const first = await createInvitation({ ...staffInput, now: dayOne }, repository)

    const resent = await resendInvitation({ actorId: 'owner', businessId: 'business-a', invitationId: first.id, now: dayTwo }, repository)

    expect(resent.token).not.toBe(first.token)
    expect(resent.expiresAt).toEqual(sevenDaysAfter(dayTwo))
    expect(state.invitations.get(first.id)?.tokenHash).toBe(createHash('sha256').update(resent.token).digest('hex'))
    await expect(acceptInvitation({ token: first.token, actorId: 'invitee', now: dayTwo }, repository)).rejects.toThrow('INVITATION_NOT_FOUND')
  })

  it('rejects expired, revoked, and replayed tokens', async () => {
    const expired = fixture()
    const expiring = await createInvitation({ ...staffInput, now: dayOne }, expired.repository)
    await expect(acceptInvitation({ token: expiring.token, actorId: 'invitee', now: dayEight }, expired.repository)).rejects.toThrow('INVITATION_EXPIRED')

    const revoked = fixture()
    const toRevoke = await createInvitation({ ...staffInput, now: dayOne }, revoked.repository)
    await revokeInvitation({ actorId: 'owner', businessId: 'business-a', invitationId: toRevoke.id, now: dayTwo }, revoked.repository)
    await expect(acceptInvitation({ token: toRevoke.token, actorId: 'invitee', now: dayTwo }, revoked.repository)).rejects.toThrow('INVITATION_REVOKED')

    const accepted = fixture()
    const oneUse = await createInvitation({ ...staffInput, now: dayOne }, accepted.repository)
    await acceptInvitation({ token: oneUse.token, actorId: 'invitee', now: dayTwo }, accepted.repository)
    await expect(acceptInvitation({ token: oneUse.token, actorId: 'invitee', now: dayTwo }, accepted.repository)).rejects.toThrow('INVITATION_ALREADY_ACCEPTED')
  })

  it('requires the authenticated normalized email on acceptance', async () => {
    const { repository } = fixture()
    const invitation = await createInvitation({ ...staffInput, now: dayOne }, repository)

    await expect(acceptInvitation({ token: invitation.token, actorId: 'other-user', now: dayTwo }, repository)).rejects.toThrow('INVITATION_EMAIL_MISMATCH')
  })

  it('refuses a tampered persisted invitation that requests Owner access', async () => {
    const { state, repository } = fixture()
    const invitation = await createInvitation({ ...staffInput, now: dayOne }, repository)
    state.invitations.get(invitation.id)!.role = 'OWNER'

    await expect(acceptInvitation({ token: invitation.token, actorId: 'invitee', now: dayTwo }, repository)).rejects.toThrow('INVITATION_ROLE_DENIED')
    expect(state.memberships.size).toBe(0)
  })

  it('transactionally attaches an existing account with assignments, qualifications, acceptance, and audit evidence', async () => {
    const { state, repository } = fixture()
    const invitation = await createInvitation({ ...staffInput, now: dayOne }, repository)

    const accepted = await acceptInvitation({ token: invitation.token, actorId: 'invitee', now: dayTwo }, repository)

    expect(accepted).toMatchObject({ businessId: 'business-a', created: true })
    expect(state.memberships.get('business-a:invitee')).toMatchObject({ role: 'STAFF', active: true, locationIds: ['castries'], qualifications: [{ offeringId: 'facial', locationId: 'castries' }] })
    expect(state.invitations.get(invitation.id)).toMatchObject({ acceptedAt: dayTwo, activeKey: null })
    expect(state.audits.map(({ action }) => action)).toEqual(['TEAM_INVITATION_CREATED', 'TEAM_INVITATION_ACCEPTED'])
  })

  it('reactivates an inactive existing membership without creating a duplicate', async () => {
    const { state, repository } = fixture()
    state.memberships.set('business-a:invitee', { id: 'inactive-membership', businessId: 'business-a', userId: 'invitee', role: 'STAFF', active: false, locationIds: [], qualifications: [] })
    const invitation = await createInvitation({ ...staffInput, now: dayOne }, repository)

    const result = await acceptInvitation({ token: invitation.token, actorId: 'invitee', now: dayTwo }, repository)

    expect(result).toMatchObject({ membershipId: 'inactive-membership', created: false })
    expect(state.memberships.size).toBe(1)
    expect(state.memberships.get('business-a:invitee')?.active).toBe(true)
  })

  it('rechecks actor access inside every invitation mutation transaction', async () => {
    const { state, repository } = fixture()
    state.beforeTransaction = () => { state.actors.get('manager')!.active = false }

    await expect(createInvitation({ ...staffInput, actorId: 'manager', now: dayOne }, repository)).rejects.toThrow('TEAM_ACCESS_DENIED')
    expect(state.invitations.size).toBe(0)
  })

  it('denies resend/revoke when the caller acts from an active business other than the invitation\'s own', async () => {
    const { state, repository } = fixture()
    const invitation = await createInvitation({ ...staffInput, now: dayOne }, repository)

    await expect(resendInvitation({ actorId: 'owner-b', businessId: 'business-b', invitationId: invitation.id, now: dayTwo }, repository)).rejects.toThrow('INVITATION_NOT_FOUND')
    await expect(revokeInvitation({ actorId: 'owner-b', businessId: 'business-b', invitationId: invitation.id, now: dayTwo }, repository)).rejects.toThrow('INVITATION_NOT_FOUND')
    expect(state.invitations.get(invitation.id)).toMatchObject({ acceptedAt: null, revokedAt: null })
  })
})
