import { describe, expect, it } from 'vitest'
import { selectAuthorizedContext } from '@/modules/organizations/context'

const memberships = [
	{ businessId: 'business-1', active: true, locationIds: ['loc-1', 'loc-2'] },
	{ businessId: 'business-2', active: true, locationIds: ['loc-3'] },
]

describe('business context selection', () => {
	it('selects an explicitly authorized business and location', () => {
		expect(selectAuthorizedContext(memberships, 'business-2', 'loc-3')).toEqual({ businessId: 'business-2', locationId: 'loc-3' })
	})

	it('rejects a location outside the selected membership', () => {
		expect(() => selectAuthorizedContext(memberships, 'business-1', 'loc-3')).toThrow('LOCATION_ACCESS_DENIED')
	})

	it('uses the first active membership when no selection exists', () => {
		expect(selectAuthorizedContext(memberships)).toEqual({ businessId: 'business-1', locationId: 'loc-1' })
	})
})
