import { describe, expect, it } from 'vitest'
import { toLegacyOrganization } from '@/modules/organizations/legacy-backfill'

describe('legacy organization backfill', () => {
	it('maps a spa and its linked employees into one business and primary location', () => {
		const result = toLegacyOrganization({
			id: 'spa-1',
			ownerId: 'owner-1',
			name: 'Island Studio',
			slug: 'island-studio',
			address: 'Castries',
			phone: '758-555-0100',
			email: 'hello@example.com',
			businessHours: { monday: ['09:00', '17:00'] },
			Employees: [{ userId: 'staff-1' }, { userId: null }],
		})

		expect(result.business).toEqual({
			name: 'Island Studio',
			slug: 'island-studio',
			status: 'SETUP',
			defaultCurrency: 'XCD',
			legacySpaId: 'spa-1',
		})
		expect(result.memberships).toEqual([
			{ userId: 'owner-1', role: 'OWNER' },
			{ userId: 'staff-1', role: 'STAFF' },
		])
	})
})
