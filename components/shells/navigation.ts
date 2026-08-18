import type { BusinessRole } from '@prisma/client'

export type WorkspaceNavItem = { label: string; href: string }

const overview = { label: 'Overview', href: '/business' }
const schedule = { label: 'My schedule', href: '/business/schedule' }
const customers = { label: 'Customers', href: '/business/customers' }

export function getWorkspaceNavigation(role: BusinessRole): WorkspaceNavItem[] {
	switch (role) {
		case 'OWNER':
			return [overview, { label: 'Calendar', href: '/business/calendar' }, customers, { label: 'Services', href: '/business/services' }, { label: 'Team', href: '/business/team' }, { label: 'Locations', href: '/business/locations' }, { label: 'Finance', href: '/business/finance' }, { label: 'Business settings', href: '/business/settings' }]
		case 'MANAGER':
			return [overview, { label: 'Calendar', href: '/business/calendar' }, customers, { label: 'Services', href: '/business/services' }, { label: 'Team', href: '/business/team' }, { label: 'Locations', href: '/business/locations' }]
		case 'ACCOUNTS':
			return [overview, { label: 'Finance', href: '/business/finance' }, { label: 'Locations', href: '/business/locations' }]
		case 'STAFF':
			return [overview, schedule, customers]
	}
}
