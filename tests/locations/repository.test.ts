import { describe, expect, it } from 'vitest'
import {
  createLocation,
  createPrismaLocationRepository,
  setLocationActive,
  setLocationHours,
  updateLocation,
  type LocationManagementRepository,
  type LocationRepositoryClient,
} from '@/modules/locations/management'

const values = {
  name: 'Castries Studio Updated',
  slug: 'castries-updated',
  address: '1 High Street, Castries',
  phone: '+1 758 555 0100',
  email: 'castries@example.com',
  isActive: true,
}

const week = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  closed: weekday === 0,
  opensAt: weekday === 0 ? '' : '09:00',
  closesAt: weekday === 0 ? '' : '17:00',
}))

type Member = { id: string; businessId: string; userId: string; active: boolean; role: 'OWNER' | 'MANAGER' | 'ACCOUNTS' | 'STAFF' }
type LocationRow = { id: string; businessId: string; name: string; slug: string; address: string | null; phone: string | null; email: string | null; timezone: string; isActive: boolean }

function transactionFixture() {
  const state = {
    memberships: [{ id: 'manager-membership', businessId: 'business-a', userId: 'manager', active: true, role: 'MANAGER' }] as Member[],
    assignments: new Set(['manager-membership:assigned']),
    locations: new Map<string, LocationRow>([
      ['assigned', { id: 'assigned', businessId: 'business-a', name: 'Castries Studio', slug: 'castries', address: '1 High Street', phone: null, email: null, timezone: 'America/St_Lucia', isActive: true }],
    ]),
    hours: new Map([['assigned', [{ weekday: 1, startMinute: 480, endMinute: 960 }]]]),
    bookings: [{ id: 'historical-booking', locationId: 'assigned' }],
    audits: [] as Array<{ action: string; details: unknown }>,
    nextLocationId: 1,
    beforeTransaction: undefined as undefined | (() => void),
    transactionIsolationLevels: [] as Array<string | undefined>,
  }

  const transaction = {
    businessMembership: {
      async findFirst({ where }: any) {
        const member = state.memberships.find((candidate) => candidate.businessId === where.businessId && candidate.userId === where.userId && candidate.active === where.active)
        if (!member || (where.role?.in && !where.role.in.includes(member.role))) return null
        return { id: member.id, role: member.role }
      },
    },
    locationAssignment: {
      async findUnique({ where }: any) {
        const key = `${where.membershipId_locationId.membershipId}:${where.membershipId_locationId.locationId}`
        return state.assignments.has(key) ? { membershipId: where.membershipId_locationId.membershipId } : null
      },
      async create({ data }: any) {
        state.assignments.add(`${data.membershipId}:${data.locationId}`)
        return data
      },
    },
    location: {
      async findFirst({ where }: any) {
        const location = state.locations.get(where.id)
        return location?.businessId === where.businessId ? { id: location.id, businessId: location.businessId } : null
      },
      async create({ data }: any) {
        const id = `created-${state.nextLocationId++}`
        state.locations.set(id, { id, ...data })
        return { id }
      },
      async update({ where, data }: any) {
        const current = state.locations.get(where.id)
        if (!current) throw new Error('LOCATION_NOT_FOUND')
        state.locations.set(where.id, { ...current, ...data })
        return { id: where.id }
      },
      async updateMany({ where, data }: any) {
        const current = state.locations.get(where.id)
        if (!current || current.businessId !== where.businessId) return { count: 0 }
        state.locations.set(where.id, { ...current, ...data })
        return { count: 1 }
      },
    },
    locationHours: {
      async deleteMany({ where }: any) {
        state.hours.delete(where.locationId)
        return { count: 1 }
      },
      async createMany({ data }: any) {
        const locationId = data[0]?.locationId
        if (locationId) state.hours.set(locationId, data.map(({ weekday, startMinute, endMinute }: any) => ({ weekday, startMinute, endMinute })))
        return { count: data.length }
      },
    },
    auditLog: {
      async create({ data }: any) {
        state.audits.push({ action: data.action, details: data.details })
        return data
      },
    },
    bookingSegment: {
      async deleteMany({ where }: any) {
        state.bookings = state.bookings.filter((booking) => booking.locationId !== where.locationId)
        return { count: 1 }
      },
    },
  }

  const client = {
    location: {
      async findFirst({ where }: any) {
        const location = state.locations.get(where.id)
        return location?.businessId === where.businessId ? { id: location.id, businessId: location.businessId } : null
      },
      async count() { return 0 },
      async findMany() { return [] },
    },
    async $transaction<T>(callback: (tx: any) => Promise<T>, options?: { isolationLevel?: string }) {
      state.transactionIsolationLevels.push(options?.isolationLevel)
      state.beforeTransaction?.()
      state.beforeTransaction = undefined
      return callback(transaction)
    },
  } as unknown as LocationRepositoryClient

  const persisted = createPrismaLocationRepository(client)
  const repository: LocationManagementRepository = {
    ...persisted,
    async authorize() {
      return { businessId: 'business-a', role: 'MANAGER', membershipId: 'manager-membership', assignedLocationIds: ['assigned'] }
    },
  }
  return { state, repository }
}

describe('transaction-bound location authorization', () => {
  it('rechecks active role before creating and does not trust stale preflight access', async () => {
    const { state, repository } = transactionFixture()
    state.beforeTransaction = () => { state.memberships[0].active = false }

    await expect(createLocation({ actorId: 'manager', businessId: 'business-a', values }, repository)).rejects.toThrow('BUSINESS_ACCESS_DENIED')
    expect(Array.from(state.locations.keys())).toEqual(['assigned'])
    expect(state.assignments).toEqual(new Set(['manager-membership:assigned']))
  })

  it.each([
    ['identity', (repository: LocationManagementRepository) => updateLocation({ actorId: 'manager', businessId: 'business-a', locationId: 'assigned', values }, repository)],
    ['hours', (repository: LocationManagementRepository) => setLocationHours({ actorId: 'manager', businessId: 'business-a', locationId: 'assigned', hours: week }, repository)],
    ['active state', (repository: LocationManagementRepository) => setLocationActive({ actorId: 'manager', businessId: 'business-a', locationId: 'assigned', active: false }, repository)],
  ])('rechecks Manager assignment inside the %s write transaction', async (_label, mutate) => {
    const { state, repository } = transactionFixture()
    state.beforeTransaction = () => { state.assignments.delete('manager-membership:assigned') }

    await expect(mutate(repository)).rejects.toThrow('LOCATION_ACCESS_DENIED')
    expect(state.locations.get('assigned')).toMatchObject({ name: 'Castries Studio', isActive: true })
    expect(state.hours.get('assigned')).toEqual([{ weekday: 1, startMinute: 480, endMinute: 960 }])
    expect(state.audits).toEqual([])
  })

  it('rechecks the active role inside a target mutation transaction', async () => {
    const { state, repository } = transactionFixture()
    state.beforeTransaction = () => { state.memberships[0].role = 'ACCOUNTS' }

    await expect(setLocationHours({ actorId: 'manager', businessId: 'business-a', locationId: 'assigned', hours: week }, repository)).rejects.toThrow('BUSINESS_ACCESS_DENIED')
    expect(state.hours.get('assigned')).toEqual([{ weekday: 1, startMinute: 480, endMinute: 960 }])
  })

  it('rechecks the location tenant inside the write transaction', async () => {
    const { state, repository } = transactionFixture()
    state.beforeTransaction = () => { state.locations.get('assigned')!.businessId = 'business-b' }

    await expect(updateLocation({ actorId: 'manager', businessId: 'business-a', locationId: 'assigned', values }, repository)).rejects.toThrow('LOCATION_ACCESS_DENIED')
    expect(state.locations.get('assigned')?.name).toBe('Castries Studio')
  })

  it('uses the current Manager membership for assignment in the create transaction', async () => {
    const { state, repository } = transactionFixture()

    const result = await createLocation({ actorId: 'manager', businessId: 'business-a', values }, repository)

    expect(result).toEqual({ ok: true, locationId: 'created-1' })
    expect(state.assignments.has('manager-membership:created-1')).toBe(true)
  })

  it('uses serializable transactions for every authorization-and-write boundary', async () => {
    const { state, repository } = transactionFixture()

    await createLocation({ actorId: 'manager', businessId: 'business-a', values }, repository)
    await updateLocation({ actorId: 'manager', businessId: 'business-a', locationId: 'assigned', values }, repository)
    await setLocationHours({ actorId: 'manager', businessId: 'business-a', locationId: 'assigned', hours: week }, repository)
    await setLocationActive({ actorId: 'manager', businessId: 'business-a', locationId: 'assigned', active: false }, repository)

    expect(state.transactionIsolationLevels).toEqual(['Serializable', 'Serializable', 'Serializable', 'Serializable'])
  })

  it('deactivates and audits while the transaction-owned historical bookings remain intact', async () => {
    const { state, repository } = transactionFixture()

    const result = await setLocationActive({ actorId: 'manager', businessId: 'business-a', locationId: 'assigned', active: false }, repository)

    expect(result).toEqual({ ok: true, locationId: 'assigned' })
    expect(state.locations.get('assigned')?.isActive).toBe(false)
    expect(state.audits).toEqual([{ action: 'LOCATION_DEACTIVATED', details: { businessId: 'business-a', locationId: 'assigned', active: false } }])
    expect(state.bookings).toEqual([{ id: 'historical-booking', locationId: 'assigned' }])
  })
})
