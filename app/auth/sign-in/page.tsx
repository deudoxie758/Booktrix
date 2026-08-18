'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { buildPostAuthRedirectUrl } from '@/modules/identity/post-auth'

export default function SignInPage() {
	const [isSignUp, setIsSignUp] = useState(false)
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [name, setName] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState('')
	const searchParams = useSearchParams()
	const callbackUrl = buildPostAuthRedirectUrl(searchParams.get('callbackUrl'), window.location.origin)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setIsLoading(true)
		setError('')

		if (isSignUp) {
			// Sign up
			try {
				const res = await fetch('/api/auth/signup', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email, password, name }),
				})
				const data = await res.json()
				if (res.ok) {
					// Auto sign in after signup
					await signIn('credentials', { email, password, callbackUrl, redirect: true })
				} else {
					setError(data.error || 'Failed to sign up')
					setIsLoading(false)
				}
			} catch (err) {
				setError('Something went wrong')
				setIsLoading(false)
			}
		} else {
			// Route through the server so Phase 2 membership roles choose the right workspace.
			await signIn('credentials', {
				email,
				password,
				callbackUrl,
				redirect: true,
			})
		}
	}

	return (
		<div className='min-h-screen bg-black flex items-center justify-center p-6'>
			<div className='w-full max-w-md'>
				{/* Logo & Title */}
				<div className='text-center mb-8'>
					<h1 className='text-6xl font-light text-white mb-2 tracking-wider'>
						FLO
					</h1>
					<p className='text-warm-300 text-sm tracking-wide'>
						{isSignUp
							? 'Create your wellness account'
							: 'Welcome back to serenity'}
					</p>
				</div>

				{/* Sign In Card */}
				<div className='bg-zinc-900 rounded-3xl shadow-2xl p-8 border border-zinc-800'>
					{error && (
						<div className='mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm'>
							{error}
						</div>
					)}

					<form onSubmit={handleSubmit} className='space-y-5'>
						{isSignUp && (
							<div>
								<label
									htmlFor='name'
									className='block text-sm font-medium text-zinc-400 mb-2'
								>
									Full Name
								</label>
								<input
									id='name'
									type='text'
									className='w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-warm-400 focus:border-transparent transition-all text-white placeholder-zinc-500'
									placeholder='Your name'
									value={name}
									onChange={(e) => setName(e.target.value)}
									required={isSignUp}
								/>
							</div>
						)}

						<div>
							<label
								htmlFor='email'
								className='block text-sm font-medium text-zinc-400 mb-2'
							>
								Email Address
							</label>
							<input
								id='email'
								type='email'
								className='w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-warm-400 focus:border-transparent transition-all text-white placeholder-zinc-500'
								placeholder='you@example.com'
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>
						</div>

						<div>
							<label
								htmlFor='password'
								className='block text-sm font-medium text-zinc-400 mb-2'
							>
								Password
							</label>
							<input
								id='password'
								type='password'
								className='w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-warm-400 focus:border-transparent transition-all text-white placeholder-zinc-500'
								placeholder='••••••••'
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
							/>
						</div>

						<button
							type='submit'
							disabled={isLoading}
							className='w-full py-3 px-4 bg-gradient-to-r from-warm-400 to-nude-400 text-black font-medium rounded-xl hover:from-warm-500 hover:to-nude-500 focus:outline-none focus:ring-2 focus:ring-warm-400 focus:ring-offset-2 focus:ring-offset-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl'
						>
							{isLoading
								? isSignUp
									? 'Creating account...'
									: 'Signing in...'
								: isSignUp
								? 'Create Account'
								: 'Sign In'}
						</button>
					</form>

					<div className='mt-6'>
						<div className='relative'>
							<div className='absolute inset-0 flex items-center'>
								<div className='w-full border-t border-zinc-800'></div>
							</div>
							<div className='relative flex justify-center text-sm'>
								<span className='px-4 bg-zinc-900 text-zinc-500'>
									Or continue with
								</span>
							</div>
						</div>

						<button
							onClick={() => signIn('google', { callbackUrl })}
							className='mt-4 w-full py-3 px-4 border border-zinc-800 rounded-xl text-zinc-300 font-medium hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-warm-400 focus:ring-offset-2 focus:ring-offset-black transition-all flex items-center justify-center gap-3'
						>
							<svg className='w-5 h-5' viewBox='0 0 24 24'>
								<path
									fill='#4285F4'
									d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
								/>
								<path
									fill='#34A853'
									d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
								/>
								<path
									fill='#FBBC05'
									d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
								/>
								<path
									fill='#EA4335'
									d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
								/>
							</svg>
							Continue with Google
						</button>
					</div>

					<div className='mt-6 text-center'>
						<button
							onClick={() => {
								setIsSignUp(!isSignUp)
								setError('')
							}}
							className='text-sm text-zinc-400 hover:text-warm-400 transition-colors'
						>
							{isSignUp ? (
								<>
									Already have an account?{' '}
									<span className='font-medium'>Sign in</span>
								</>
							) : (
								<>
									Don't have an account?{' '}
									<span className='font-medium'>Sign up</span>
								</>
							)}
						</button>
					</div>

					{!isSignUp && (
						<div className='mt-6 text-center text-sm text-zinc-600'>
							<p>
								Demo:
								<br />
								<span className='font-mono text-xs bg-zinc-800 px-2 py-1 rounded'>
									customer@example.com / password123
								</span>
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
