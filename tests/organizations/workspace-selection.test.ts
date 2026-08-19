import { describe, expect, it } from 'vitest'

import { selectedBusinessCookie, workspaceDestination, workspaceSelectionHref } from '@/modules/organizations/workspace-selection'

describe('workspace selection', () => {
  it('builds an encoded selector URL for a specific authorized business', () => {
    expect(workspaceSelectionHref('business one')).toBe('/business/select?businessId=business+one')
    expect(selectedBusinessCookie).toBe('booktrix-business')
  })

  it('opens the right primary area for each workspace role', () => {
    expect(workspaceDestination('OWNER')).toBe('/business/calendar')
    expect(workspaceDestination('MANAGER')).toBe('/business/calendar')
    expect(workspaceDestination('STAFF')).toBe('/business/schedule')
    expect(workspaceDestination('ACCOUNTS')).toBe('/business/finance')
  })
})
