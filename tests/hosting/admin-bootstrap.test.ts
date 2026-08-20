import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { readAdminBootstrapConfig } = require('../../scripts/admin-bootstrap-config.js')

describe('admin bootstrap configuration', () => {
  it('requires explicit admin credentials', () => {
    expect(() => readAdminBootstrapConfig({})).toThrow('ADMIN_EMAIL')
    expect(() => readAdminBootstrapConfig({ ADMIN_EMAIL: 'admin@booktrix.test' })).toThrow('ADMIN_PASSWORD')
  })

  it('rejects weak bootstrap passwords', () => {
    expect(() => readAdminBootstrapConfig({ ADMIN_EMAIL: 'admin@booktrix.test', ADMIN_PASSWORD: 'password123' })).toThrow('at least 16 characters')
    expect(() => readAdminBootstrapConfig({ ADMIN_EMAIL: 'admin@booktrix.test', ADMIN_PASSWORD: 'password123456789' })).toThrow('weak')
  })

  it('returns explicit secure credentials without logging the password', () => {
    expect(readAdminBootstrapConfig({ ADMIN_EMAIL: 'admin@booktrix.test', ADMIN_PASSWORD: 'A-secure-bootstrap-secret', ADMIN_NAME: 'Platform Admin' })).toEqual({
      email: 'admin@booktrix.test', password: 'A-secure-bootstrap-secret', name: 'Platform Admin',
    })
  })

  it('normalizes and validates the administrator email', () => {
    expect(readAdminBootstrapConfig({ ADMIN_EMAIL: ' Admin@Booktrix.Test ', ADMIN_PASSWORD: 'A-secure-bootstrap-secret' }).email).toBe('admin@booktrix.test')
    expect(() => readAdminBootstrapConfig({ ADMIN_EMAIL: 'not-an-email', ADMIN_PASSWORD: 'A-secure-bootstrap-secret' })).toThrow('valid email')
  })
})
