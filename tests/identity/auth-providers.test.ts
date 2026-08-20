import { afterEach, describe, expect, it, vi } from 'vitest'

describe('configured authentication providers', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
		vi.resetModules()
	})

	it('does not register Google when either credential is missing', async () => {
		vi.stubEnv('GOOGLE_CLIENT_ID', '')
		vi.stubEnv('GOOGLE_CLIENT_SECRET', '')
		const { authOptions } = await import('@/lib/auth')

		expect(authOptions.providers.map((provider) => provider.id)).toEqual(['credentials'])
	})

	it('registers Google when both credentials are configured', async () => {
		vi.stubEnv('GOOGLE_CLIENT_ID', 'google-client')
		vi.stubEnv('GOOGLE_CLIENT_SECRET', 'google-secret')
		const { authOptions } = await import('@/lib/auth')

		expect(authOptions.providers.map((provider) => provider.id)).toEqual(['google', 'credentials'])
	})

	it('allows a completed sign-out to return to the public homepage', async () => {
		vi.stubEnv('GOOGLE_CLIENT_ID', '')
		vi.stubEnv('GOOGLE_CLIENT_SECRET', '')
		const { authOptions } = await import('@/lib/auth')
		const redirect = authOptions.callbacks?.redirect

		expect(redirect).toBeTypeOf('function')
		await expect(redirect!({ url: 'https://booktrix.test/', baseUrl: 'https://booktrix.test' })).resolves.toBe('https://booktrix.test/')
	})
})
