'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'

import { buildPostAuthRedirectUrl } from '@/modules/identity/post-auth'

export function SignInForm({ googleEnabled }: { googleEnabled: boolean }) {
	const searchParams = useSearchParams()
	const callbackUrl = searchParams.get('callbackUrl')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState('')
	const errorRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (error) errorRef.current?.focus()
	}, [error])

	const postAuthUrl = () => buildPostAuthRedirectUrl(callbackUrl, window.location.origin)

	const submit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setError('')
		setIsLoading(true)
		try {
			const result = await signIn('credentials', { email, password, callbackUrl: postAuthUrl(), redirect: false })
			if (!result?.ok || result.error || !result.url) {
				setError('We could not sign you in. Check your email or password and try again.')
				setIsLoading(false)
				return
			}
			window.location.assign(result.url)
		} catch {
			setError('We could not sign you in right now. Please try again.')
			setIsLoading(false)
		}
	}

	const googleSignIn = async () => {
		setError('')
		setIsLoading(true)
		try {
			await signIn('google', { callbackUrl: postAuthUrl(), redirect: true })
		} catch {
			setError('Google sign-in is unavailable right now. Please try again.')
			setIsLoading(false)
		}
	}

	return <>
		{error && <div ref={errorRef} role="alert" tabIndex={-1} className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500">{error}</div>}
		<form onSubmit={submit} className="space-y-5">
			<Field label="Email address" id="sign-in-email" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="you@example.com" />
			<Field label="Password" id="sign-in-password" type="password" value={password} onChange={setPassword} autoComplete="current-password" placeholder="Enter your password" />
			<button type="submit" disabled={isLoading} aria-busy={isLoading} className="w-full rounded-full bg-cocoa-900 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cocoa-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-65">{isLoading ? 'Signing in…' : 'Sign in'}</button>
		</form>

		{googleEnabled && <SocialSignIn label="Continue with Google" disabled={isLoading} onClick={googleSignIn} />}

		<p className="mt-7 text-center text-sm text-cocoa-600">New to Booktrix? <Link href={authRoute('/auth/signup', callbackUrl)} className="font-semibold text-clay-600 underline decoration-clay-200 underline-offset-4 hover:text-cocoa-950">Create an account</Link></p>
	</>
}

function Field({ label, id, type, value, onChange, autoComplete, placeholder }: { label: string; id: string; type: 'email' | 'password'; value: string; onChange: (value: string) => void; autoComplete: string; placeholder: string }) {
	return <div><label htmlFor={id} className="mb-2 block text-sm font-semibold text-cocoa-800">{label}</label><input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} placeholder={placeholder} required className="w-full rounded-2xl border border-sand-300 bg-white px-4 py-3.5 text-cocoa-950 placeholder:text-cocoa-400 focus:border-clay-500 focus:outline-none focus:ring-2 focus:ring-clay-200" /></div>
}

export function SocialSignIn({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
	return <div className="mt-6"><div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-cocoa-400"><span className="h-px flex-1 bg-sand-200" /><span>or</span><span className="h-px flex-1 bg-sand-200" /></div><button type="button" disabled={disabled} onClick={onClick} className="mt-5 flex w-full items-center justify-center gap-3 rounded-full border border-sand-300 bg-white px-6 py-3.5 text-sm font-semibold text-cocoa-900 transition hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-65"><GoogleMark />{label}</button></div>
}

function GoogleMark() {
	return <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.31v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.99.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.43.35-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.58 10.58 0 0 0 12 1a11 11 0 0 0-9.82 6.07L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38Z"/></svg>
}

export function authRoute(path: string, callbackUrl: string | null) {
	return callbackUrl ? `${path}?callbackUrl=${encodeURIComponent(callbackUrl)}` : path
}
