import { describe, expect, it } from 'vitest'
import {
  createLocation,
  listManagedLocations,
  setLocationActive,
  setLocationHours,
  updateLocation,
  type LocationManagementRepository,
} from '@/modules/locations/management'

const validValues = {
  name: 'Rodney Bay Studio',
  slug: '  Rodney Bay Studio  ',
  address: 'Baywalk Mall, Rodney Bay',
  phone: '+1 758 555 0199',
  email: 'rodney@example.com',
  isActive: true,
}

const week = [
  { weekday: 0, closed: true, opensAt: '', closesAt: '' },
  { weekday: 1, closed: false, opensAt: '09:00', closesAt: '17:00' },
  { weekday: 2, closed: false, opensAt: '09:00', closesAt: '17:00' },
  { weekday: 3, closed: false, opensAt: '09:00', closesAt: '17:00' },
  { weekday: 4, closed: false, opensAt: '09:00', closesAt: '17:00' },
  { weekday: 5, closed: false, opensAt: '09:00', closesAt: '18:00' },
  { weekday: 6, closed: true, opensAt: '', closesAt: '' },
]

type StoredLocation = {
  id: string
  businessId: string
  name: string
  slug: string
  address: string | null
  phone: string | null
  email: string | null
  timezone: string
  isActive: boolean
  hours: Array<{ weekday: number; startMinute: number; endMinute: number }>
  serviceCount: number
  teamCount: number
}

function fixture() {
  const locations = new Map<string, StoredLocation>([
    ['assigned', { id: 'assigned', businessId: 'business-a', name: 'Castries', slug: 'castries', address: '1 High Street', phone: null, email: null, timezone: 'America/St_Lucia', isActive: true, hours: [], serviceCount: 2, teamCount: 4 }],
    ['unassigned', { id: 'unassigned', businessId: 'business-a', name: 'Soufriere', slug: 'soufriere', address: '2 Bridge Street', phone: null, email: null, timezone: 'America/St_Lucia', isActive: true, hours: [], serviceCount: 1, teamCount: 1 }],
    ['business-b-location', { id: 'business-b-location', businessId: 'business-b', name: 'Foreign', slug: 'foreign', address: 'Elsewhere', phone: null, email: null, timezone: 'America/St_Lucia', isActive: true, hours: [], serviceCount: 9, teamCount: 9 }],
  ])
  const bookings = [{ id: 'booking-1', locationId: 'assigned' }]
  const audits: Array<{ businessId: string; actorId: string; locationId: string; active: boolean }> = []

  const repository: LocationManagementRepository = {
    async authorize({ actorId, businessId }) {
      if (businessId !== 'business-a') throw new Error('BUSINESS_ACCESS_DENIED')
      if (actorId === 'owner') return { businessId, role: 'OWNER', assignedLocationIds: [] }
      if (actorId === 'manager') return { businessId, role: 'MANAGER', assignedLocationIds: ['assigned'] }
      if (actorId === 'accounts') return { businessId, role: 'ACCOUNTS', assignedLocationIds: ['assigned'] }
      throw new Error('BUSINESS_ACCESS_DENIED')
    },
    async findLocation({ locationId }) {
      const location = locations.get(locationId)
      return location ? { id: location.id, businessId: location.businessId } : null
    },
    async isSlugTaken({ businessId, slug, excludeLocationId }) {
      return Array.from(locations.values()).some((location) => location.businessId === businessId && location.slug === slug && location.id !== excludeLocationId)
    },
    async create({ businessId, values }) {
      const id = `location-${locations.size + 1}`
      locations.set(id, { id, businessId, ...values, hours: [], serviceCount: 0, teamCount: 0 })
      return { id }
    },
    async update({ locationId, values }) {
      const current = locations.get(locationId)!
      locations.set(locationId, { ...current, ...values })
      return { id: locationId }
    },
    async replaceHours({ locationId, hours }) {
      const current = locations.get(locationId)!
      locations.set(locationId, { ...current, hours })
      return { id: locationId }
    },
    async setActiveWithAudit(input) {
      const current = locations.get(input.locationId)!
      locations.set(input.locationId, { ...current, isActive: input.active })
      audits.push(input)
      return { id: input.locationId }
    },
    async list() {
      return Array.from(locations.values())
    },
  }

  return { repository, locations, bookings, audits }
}

describe('location management tenant and role boundaries', () => {
  it('rejects a manager editing a location outside the active business', async () => {
    const { repository } = fixture()

    await expect(updateLocation({ actorId: 'manager', businessId: 'business-a', locationId: 'business-b-location', values: validValues }, repository)).rejects.toThrow('LOCATION_ACCESS_DENIED')
  })

  it('allows accounts to read but not mutate assigned locations', async () => {
    const { repository } = fixture()

    const locations = await listManagedLocations({ actorId: 'accounts', businessId: 'business-a' }, repository)
    expect(locations.map(({ id }) => id)).toEqual(['assigned'])
    await expect(setLocationActive({ actorId: 'accounts', businessId: 'business-a', locationId: 'assigned', active: false }, repository)).rejects.toThrow('BUSINESS_ACCESS_DENIED')
  })

  it('rejects a manager editing an unassigned location in the active business', async () => {
    const { repository } = fixture()

    await expect(updateLocation({ actorId: 'manager', businessId: 'business-a', locationId: 'unassigned', values: validValues }, repository)).rejects.toThrow('LOCATION_ACCESS_DENIED')
  })

  it('defensively removes foreign-business records from reads', async () => {
    const { repository } = fixture()

    const locations = await listManagedLocations({ actorId: 'owner', businessId: 'business-a' }, repository)
    expect(locations.map(({ id }) => id)).toEqual(['assigned', 'unassigned'])
  })
})

describe('location identity validation', () => {
  it('normalizes slugs and rejects a duplicate slug only within the active business', async () => {
    const { repository, locations } = fixture()

    const created = await createLocation({ actorId: 'owner', businessId: 'business-a', values: validValues }, repository)
    expect(created.ok).toBe(true)
    const stored = created.ok ? locations.get(created.locationId) : null
    expect(stored?.slug).toBe('rodney-bay-studio')
    expect(stored?.timezone).toBe('America/St_Lucia')

    const duplicate = await createLocation({ actorId: 'owner', businessId: 'business-a', values: { ...validValues, name: 'Another Castries', slug: ' Castries ' } }, repository)
    expect(duplicate).toEqual({ ok: false, error: 'Please correct the highlighted fields.', fieldErrors: { slug: 'This slug is already used by another location.' } })
  })

  it('returns field errors for missing identity, an overlong phone, and an invalid email', async () => {
    const { repository } = fixture()

    const result = await createLocation({
      actorId: 'owner',
      businessId: 'business-a',
      values: { ...validValues, name: ' ', address: ' ', phone: '1'.repeat(31), email: 'not-an-email' },
    }, repository)

    expect(result).toMatchObject({
      ok: false,
      fieldErrors: {
        name: 'Location name is required.',
        address: 'Address is required.',
        phone: 'Phone must be 30 characters or fewer.',
        email: 'Enter a valid email address.',
      },
    })
  })
})

describe('weekly opening hours', () => {
  it('requires exactly one row for every weekday', async () => {
    const { repository } = fixture()

    const missingDay = await setLocationHours({ actorId: 'owner', businessId: 'business-a', locationId: 'assigned', hours: week.slice(0, 6) }, repository)
    expect(missingDay).toEqual({ ok: false, error: 'Enter opening hours for all seven days.', fieldErrors: { hours: 'Each weekday must appear exactly once.' } })

    const duplicateDay = await setLocationHours({ actorId: 'owner', businessId: 'business-a', locationId: 'assigned', hours: [...week.slice(0, 6), { ...week[5] }] }, repository)
    expect(duplicateDay).toEqual({ ok: false, error: 'Enter opening hours for all seven days.', fieldErrors: { hours: 'Each weekday must appear exactly once.' } })
  })

  it('rejects malformed times and closing times that are not after opening', async () => {
    const { repository } = fixture()

    const malformed = await setLocationHours({ actorId: 'owner', businessId: 'business-a', locationId: 'assigned', hours: week.map((row) => row.weekday === 1 ? { ...row, opensAt: '9am' } : row) }, repository)
    expect(malformed).toMatchObject({ ok: false, fieldErrors: { 'hours.1.opensAt': 'Use a valid 24-hour time.' } })

    const reversed = await setLocationHours({ actorId: 'owner', businessId: 'business-a', locationId: 'assigned', hours: week.map((row) => row.weekday === 2 ? { ...row, opensAt: '17:00', closesAt: '09:00' } : row) }, repository)
    expect(reversed).toMatchObject({ ok: false, fieldErrors: { 'hours.2.closesAt': 'Closing time must be after opening time.' } })
  })

  it('transactionally replaces open days and omits closed days', async () => {
    const { repository, locations } = fixture()

    const result = await setLocationHours({ actorId: 'owner', businessId: 'business-a', locationId: 'assigned', hours: week }, repository)

    expect(result).toEqual({ ok: true, locationId: 'assigned' })
    expect(locations.get('assigned')?.hours).toEqual([
      { weekday: 1, startMinute: 540, endMinute: 1020 },
      { weekday: 2, startMinute: 540, endMinute: 1020 },
      { weekday: 3, startMinute: 540, endMinute: 1020 },
      { weekday: 4, startMinute: 540, endMinute: 1020 },
      { weekday: 5, startMinute: 540, endMinute: 1080 },
    ])
  })
})

describe('location deactivation', () => {
  it('deactivates and audits without deleting historical bookings', async () => {
    const { repository, locations, bookings, audits } = fixture()

    const result = await setLocationActive({ actorId: 'owner', businessId: 'business-a', locationId: 'assigned', active: false }, repository)

    expect(result).toEqual({ ok: true, locationId: 'assigned' })
    expect(locations.get('assigned')?.isActive).toBe(false)
    expect(bookings).toEqual([{ id: 'booking-1', locationId: 'assigned' }])
    expect(audits).toEqual([{ businessId: 'business-a', actorId: 'owner', locationId: 'assigned', active: false }])
  })
})
