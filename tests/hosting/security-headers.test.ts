import { createRequire } from 'node:module'
import { afterEach, describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const config = require('../../next.config.js')

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('application security headers', () => {
  it('applies baseline browser protections to every route', async () => {
    const entries = await config.headers()
    const global = entries.find((entry: { source: string }) => entry.source === '/(.*)')
    const headers = Object.fromEntries(global.headers.map((header: { key: string; value: string }) => [header.key, header.value]))
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'")
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['Permissions-Policy']).toContain('camera=()')
    expect(headers['Strict-Transport-Security']).toContain('max-age=31536000')
  })

  it('allows Next development hydration without weakening the production policy', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const developmentEntries = await config.headers()
    const developmentGlobal = developmentEntries.find((entry: { source: string }) => entry.source === '/(.*)')
    const developmentHeaders = Object.fromEntries(developmentGlobal.headers.map((header: { key: string; value: string }) => [header.key, header.value]))

    vi.stubEnv('NODE_ENV', 'production')
    const productionEntries = await config.headers()
    const productionGlobal = productionEntries.find((entry: { source: string }) => entry.source === '/(.*)')
    const productionHeaders = Object.fromEntries(productionGlobal.headers.map((header: { key: string; value: string }) => [header.key, header.value]))

    expect(developmentHeaders['Content-Security-Policy']).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'")
    expect(productionHeaders['Content-Security-Policy']).not.toContain("'unsafe-eval'")
  })
})
