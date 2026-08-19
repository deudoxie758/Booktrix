import { describe, expect, it } from 'vitest'
import { canManageRequestedRole } from '@/modules/team/permissions'

describe('team role permissions', () => {
  it.each([
    ['MANAGER', 'STAFF', true],
    ['MANAGER', 'MANAGER', false],
    ['MANAGER', 'ACCOUNTS', false],
    ['MANAGER', 'OWNER', false],
    ['OWNER', 'MANAGER', true],
    ['OWNER', 'ACCOUNTS', true],
    ['OWNER', 'STAFF', true],
    ['OWNER', 'OWNER', false],
    ['STAFF', 'STAFF', false],
    ['ACCOUNTS', 'STAFF', false],
  ] as const)('%s requesting %s is %s', (actorRole, requestedRole, allowed) => {
    expect(canManageRequestedRole({ actorRole, requestedRole })).toBe(allowed)
  })
})
