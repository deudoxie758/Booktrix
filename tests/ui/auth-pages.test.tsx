import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }))

vi.mock('next-auth/react', () => ({ signIn }))
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('callbackUrl=/book/calm-studio?hold=held-1') }))

import SignInPage from '@/app/auth/sign-in/page'
import SignUpPage from '@/app/auth/signup/page'

describe('Booktrix authentication pages', () => {
	beforeEach(() => {
		signIn.mockReset()
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('renders separate Booktrix sign-in and sign-up experiences without legacy branding', () => {
		const { unmount } = render(<SignInPage />)
		expect(screen.getByRole('heading', { name: /sign in to booktrix/i })).toBeVisible()
		expect(screen.queryByText('FLO')).not.toBeInTheDocument()
		expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument()
		expect(screen.queryByRole('button', { name: /google/i })).not.toBeInTheDocument()
		expect(screen.getByRole('link', { name: /create an account/i })).toHaveAttribute('href', '/auth/signup?callbackUrl=%2Fbook%2Fcalm-studio%3Fhold%3Dheld-1')

		unmount()
		render(<SignUpPage />)
		expect(screen.getByRole('heading', { name: /create your booktrix account/i })).toBeVisible()
		expect(screen.queryByText('FLO')).not.toBeInTheDocument()
		expect(screen.getByLabelText(/full name/i)).toBeVisible()
		expect(screen.queryByRole('button', { name: /google/i })).not.toBeInTheDocument()
		expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/auth/sign-in?callbackUrl=%2Fbook%2Fcalm-studio%3Fhold%3Dheld-1')
	})

	it('submits credentials through the role-aware held-checkout callback', async () => {
		signIn.mockResolvedValue({ ok: false, error: 'CredentialsSignin', status: 401, url: null })
		render(<SignInPage />)

		fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'customer@example.test' } })
		fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } })
		fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

		await waitFor(() => expect(signIn).toHaveBeenCalledWith('credentials', {
			email: 'customer@example.test',
			password: 'password123',
			callbackUrl: `${window.location.origin}/api/auth/redirect?callbackUrl=%2Fbook%2Fcalm-studio%3Fhold%3Dheld-1`,
			redirect: false,
		}))
		const alert = await screen.findByRole('alert')
		expect(alert).toHaveTextContent(/email or password/i)
		expect(alert).toHaveAttribute('tabindex', '-1')
	})

	it('exposes accessible sign-up validation and loading feedback', async () => {
		render(<SignUpPage />)
		fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Morgan James' } })
		fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'morgan@example.test' } })
		fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } })
		fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'different123' } })
		fireEvent.click(screen.getByRole('button', { name: /create account/i }))

		const alert = await screen.findByRole('alert')
		expect(alert).toHaveTextContent(/passwords do not match/i)
		expect(alert).toHaveAttribute('tabindex', '-1')
		expect(screen.getByRole('button', { name: /create account/i })).toHaveAttribute('aria-busy', 'false')
	})

	it('explains how to recover when automatic sign-in fails after account creation', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
			ok: true,
			status: 201,
			json: async () => ({ message: 'User created successfully', userId: 'user-1' }),
		}))
		signIn.mockRejectedValue(new Error('identity provider unavailable'))
		render(<SignUpPage />)

		fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Morgan James' } })
		fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'morgan@example.test' } })
		fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'password123' } })
		fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: 'password123' } })
		fireEvent.click(screen.getByRole('button', { name: /create account/i }))

		const alert = await screen.findByRole('alert')
		expect(alert).toHaveTextContent(/account was created, but automatic sign-in failed/i)
		expect(screen.queryByRole('status')).not.toBeInTheDocument()
	})

	it('can render both authentication routes during server rendering', () => {
		vi.stubGlobal('window', undefined)
		expect(() => renderToString(<SignInPage />)).not.toThrow()
		expect(() => renderToString(<SignUpPage />)).not.toThrow()
	})
})
