import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const config = require('../../next.config.js')

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
})
