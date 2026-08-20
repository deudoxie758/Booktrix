import type { BusinessRole } from '@prisma/client'

export const selectedBusinessCookie = 'booktrix-business'

export function workspaceSelectionHref(businessId: string) {
  const query = new URLSearchParams({ businessId })
  return `/business/select?${query}`
}

export function workspaceDestination(role: BusinessRole) {
  if (role === 'OWNER' || role === 'MANAGER') return '/business/calendar' as const
  if (role === 'ACCOUNTS') return '/business/finance' as const
  return '/business/schedule' as const
}
