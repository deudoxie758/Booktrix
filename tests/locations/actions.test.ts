import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireWorkspaceRole: vi.fn(),
  createLocation: vi.fn(),
  updateLocation: vi.fn(),
  setLocationHours: vi.fn(),
  setLocationActive: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('@/modules/organizations/context', () => ({ requireWorkspaceRole: mocks.requireWorkspaceRole }))
vi.mock('@/modules/locations/management', () => ({
  createLocation: mocks.createLocation,
  updateLocation: mocks.updateLocation,
  setLocationHours: mocks.setLocationHours,
  setLocationActive: mocks.setLocationActive,
}))

import {
  createLocationAction,
  setLocationActiveAction,
  setLocationHoursAction,
  updateLocationAction,
} from '@/app/business/locations/actions'

const context = {
  actor: { id: 'manager' },
  business: { id: 'business-a', slug: 'island-studio' },
}

function identityForm() {
  const formData = new FormData()
  formData.set('name', 'Castries Studio')
  formData.set('slug', 'castries')
  formData.set('address', '1 High Street')
  return formData
}

const refreshedPaths = ['/business', '/business/locations', '/business/services', '/search', '/spas', '/s/island-studio', '/book/island-studio']

describe('location server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireWorkspaceRole.mockResolvedValue(context)
    for (const mutation of [mocks.createLocation, mocks.updateLocation, mocks.setLocationHours, mocks.setLocationActive]) mutation.mockResolvedValue({ ok: true, locationId: 'location-1' })
  })

  it('requires Owner or Manager before a mutation can reach the domain', async () => {
    mocks.requireWorkspaceRole.mockRejectedValue(new Error('BUSINESS_ACCESS_DENIED'))

    await expect(createLocationAction(identityForm())).rejects.toThrow('BUSINESS_ACCESS_DENIED')

    expect(mocks.requireWorkspaceRole).toHaveBeenCalledWith(['OWNER', 'MANAGER'])
    expect(mocks.createLocation).not.toHaveBeenCalled()
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it.each([
    ['create', createLocationAction, mocks.createLocation, () => identityForm()],
    ['update', updateLocationAction, mocks.updateLocation, () => { const data = identityForm(); data.set('locationId', 'location-1'); return data }],
    ['hours', setLocationHoursAction, mocks.setLocationHours, () => { const data = new FormData(); data.set('locationId', 'location-1'); for (let day = 0; day < 7; day += 1) { data.set(`hours.${day}.opensAt`, '09:00'); data.set(`hours.${day}.closesAt`, '17:00') } return data }],
    ['active state', setLocationActiveAction, mocks.setLocationActive, () => { const data = new FormData(); data.set('locationId', 'location-1'); data.set('active', 'false'); return data }],
  ])('revalidates every location consumer after a successful %s mutation', async (_label, action, mutation, buildForm) => {
    await action(buildForm())

    expect(mocks.requireWorkspaceRole).toHaveBeenCalledWith(['OWNER', 'MANAGER'])
    expect(mutation).toHaveBeenCalledTimes(1)
    expect(mocks.revalidatePath.mock.calls.map(([path]) => path)).toEqual(refreshedPaths)
  })

  it('does not invalidate consumers when domain validation fails', async () => {
    mocks.createLocation.mockResolvedValue({ ok: false, error: 'Invalid location' })

    const result = await createLocationAction(identityForm())

    expect(result).toEqual({ ok: false, error: 'Invalid location' })
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })
})
