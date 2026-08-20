import type { BusinessRole } from '@prisma/client'

const ownerManagedRoles = new Set<BusinessRole>(['MANAGER', 'ACCOUNTS', 'STAFF'])

export function canManageRequestedRole({ actorRole, requestedRole }: { actorRole: BusinessRole; requestedRole: BusinessRole }) {
  if (actorRole === 'OWNER') return ownerManagedRoles.has(requestedRole)
  return actorRole === 'MANAGER' && requestedRole === 'STAFF'
}

export function canManageMemberRole({ actorRole, targetRole }: { actorRole: BusinessRole; targetRole: BusinessRole }) {
  if (actorRole === 'OWNER') return true
  return actorRole === 'MANAGER' && targetRole === 'STAFF'
}
