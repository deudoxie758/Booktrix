'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'

import { authRoute, SocialSignIn } from '@/app/auth/components/SignInForm'
import { buildPostAuthRedirectUrl } from '@/modules/identity/post-auth'

export function SignUpForm({ googleEnabled }: { googleEnabled: boolean }) {
	const searchParams = useSearchParams()
	const callbackUrl = searchParams.get('callbackUrl')
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState('')
	const [status, setStatus] = useState('')
	const feedbackRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (error || status) feedbackRef.current?.focus()
	}, [error, status])

	const postAuthUrl = () => buildPostAuthRedirectUrl(callbackUrl, window.location.origin)

	const submit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setError('')
		setStatus('')
		setIsLoading(true)
		if (password !== confirmPassword) {
			setError('Passwords do not match. Please enter them again.')
			setIsLoading(false)
			return
		}
		if (password.length < 8) {
			setError('Your password must be at least 8 characters long.')
			setIsLoading(false)
			return
		}

		try {
			const response = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) })
			const data = await response.json()
			if (!response.ok) {
				setError(data.error || 'We could not create your account. Please try again.')
				setIsLoading(false)
				return
			}
			setStatus('Your account is ready. Signing you in…')
			try {
				const result = await signIn('credentials', { email, password, callbackUrl: postAuthUrl(), redirect: false })
				if (!result?.ok || result.error || !result.url) {
					setStatus('')
					setError('Your account was created, but automatic sign-in failed. Please sign in.')
					setIsLoading(false)
					return
				}
				window.location.assign(result.url)
			} catch {
				setStatus('')
				setError('Your account was created, but automatic sign-in failed. Please sign in.')
				setIsLoading(false)
			}
		} catch {
			setError('We could not create your account right now. Please try again.')
			setIsLoading(false)
		}
	}

	const googleSignUp = async () => {
		setError('')
		setIsLoading(true)
		try {
			await signIn('google', { callbackUrl: postAuthUrl(), redirect: true })
		} catch {
			setError('Google sign-up is unavailable right now. Please try again.')
			setIsLoading(false)
		}
	}

	return <>
		{error && <div ref={feedbackRef} role="alert" tabIndex={-1} className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500">{error}</div>}
		{status && <div ref={feedbackRef} role="status" tabIndex={-1} className="mb-5 rounded-2xl border border-clay-200 bg-clay-100 px-4 py-3 text-sm font-medium text-cocoa-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-clay-500">{status}</div>}
		<form onSubmit={submit} className="space-y-5">
			<Input label="Full name" id="sign-up-name" type="text" value={name} onChange={setName} autoComplete="name" placeholder="Your full name" />
			<Input label="Email address" id="sign-up-email" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="you@example.com" />
			<div><Input label="Password" id="sign-up-password" type="password" value={password} onChange={setPassword} autoComplete="new-password" placeholder="Create a password" /><p className="mt-2 text-xs text-cocoa-600">Use at least 8 characters.</p></div>
			<Input label="Confirm password" id="confirm-password" type="password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" placeholder="Enter your password again" />
			<button type="submit" disabled={isLoading} aria-busy={isLoading} className="w-full rounded-full bg-cocoa-900 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cocoa-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-65">{isLoading ? 'Creating account…' : 'Create account'}</button>
		</form>

		{googleEnabled && <SocialSignIn label="Sign up with Google" disabled={isLoading} onClick={googleSignUp} />}

		<p className="mt-7 text-center text-sm text-cocoa-600">Already have an account? <Link href={authRoute('/auth/sign-in', callbackUrl)} className="font-semibold text-clay-600 underline decoration-clay-200 underline-offset-4 hover:text-cocoa-950">Sign in</Link></p>
	</>
}

function Input({ label, id, type, value, onChange, autoComplete, placeholder }: { label: string; id: string; type: 'text' | 'email' | 'password'; value: string; onChange: (value: string) => void; autoComplete: string; placeholder: string }) {
	return <div><label htmlFor={id} className="mb-2 block text-sm font-semibold text-cocoa-800">{label}</label><input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} placeholder={placeholder} required className="w-full rounded-2xl border border-sand-300 bg-white px-4 py-3.5 text-cocoa-950 placeholder:text-cocoa-400 focus:border-clay-500 focus:outline-none focus:ring-2 focus:ring-clay-200" /></div>
}
