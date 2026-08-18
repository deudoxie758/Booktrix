import { describe, expect, it } from 'vitest'
import { getWorkspaceNavigation } from '@/components/shells/navigation'

describe('workspace navigation', () => {
	it('shows finance but not staff management to accounts users', () => {
		const labels = getWorkspaceNavigation('ACCOUNTS').map((item) => item.label)
		expect(labels).toContain('Finance')
		expect(labels).not.toContain('Team')
	})

	it('shows company settings and team management to owners', () => {
		const labels = getWorkspaceNavigation('OWNER').map((item) => item.label)
		expect(labels).toContain('Team')
		expect(labels).toContain('Business settings')
	})

	it('limits staff to their operational views', () => {
		expect(getWorkspaceNavigation('STAFF').map((item) => item.label)).toEqual(['Overview', 'My schedule', 'Customers'])
	})
})
