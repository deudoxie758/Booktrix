import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next-auth/react', () => ({ signIn: vi.fn() }))
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('callbackUrl=/book/calm-studio') }))

import SignInPage from '@/app/auth/sign-in/page'
import SignUpPage from '@/app/auth/signup/page'

describe('auth pages on the server', () => {
	afterEach(() => vi.unstubAllGlobals())

	it('renders sign-in and signup without a browser window', () => {
		vi.stubGlobal('window', undefined)
		expect(() => renderToString(<SignInPage />)).not.toThrow()
		expect(() => renderToString(<SignUpPage />)).not.toThrow()
	})
})
