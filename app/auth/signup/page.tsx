'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignUpPage() {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [name, setName] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState('')
	const [success, setSuccess] = useState('')
	const router = useRouter()
	const callbackUrl = `${window.location.origin}/api/auth/redirect`

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')
		setSuccess('')
		setIsLoading(true)

		// Validate passwords match
		if (password !== confirmPassword) {
			setError('Passwords do not match')
			setIsLoading(false)
			return
		}

		// Validate password strength
		if (password.length < 8) {
			setError('Password must be at least 8 characters long')
			setIsLoading(false)
			return
		}

		try {
			const res = await fetch('/api/auth/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password, name }),
			})
			const data = await res.json()

			if (res.ok) {
				setSuccess('Account created successfully! Signing you in...')
				// Auto sign in after signup
				setTimeout(async () => {
					await signIn('credentials', {
						email,
						password,
						callbackUrl,
						redirect: true,
					})
				}, 1500)
			} else {
				setError(data.error || 'Failed to create account')
				setIsLoading(false)
			}
		} catch (err) {
			setError('Something went wrong. Please try again.')
			setIsLoading(false)
		}
	}

	return (
		<div className='min-h-screen bg-black flex items-center justify-center p-6'>
			<div className='w-full max-w-md'>
				{/* Logo & Title */}
				<div className='text-center mb-8'>
					<Link href='/join-us' className='inline-block mb-6'>
						<h1 className='text-6xl font-light text-white mb-2 tracking-wider hover:text-warm-400 transition-colors'>
							FLO
						</h1>
					</Link>
					<p className='text-warm-300 text-sm tracking-wide'>
						Create your wellness account
					</p>
				</div>

				{/* Sign Up Card */}
				<div className='bg-zinc-900 rounded-3xl shadow-2xl p-8 border border-zinc-800'>
					{error && (
						<div className='mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm'>
							{error}
						</div>
					)}

					{success && (
						<div className='mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm'>
							{success}
						</div>
					)}

					<form onSubmit={handleSubmit} className='space-y-5'>
						{/* Full Name */}
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
								placeholder='John Doe'
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
							/>
						</div>

						{/* Email */}
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

						{/* Password */}
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
							<p className='text-xs text-zinc-500 mt-1'>
								Minimum 8 characters
							</p>
						</div>

						{/* Confirm Password */}
						<div>
							<label
								htmlFor='confirmPassword'
								className='block text-sm font-medium text-zinc-400 mb-2'
							>
								Confirm Password
							</label>
							<input
								id='confirmPassword'
								type='password'
								className='w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-warm-400 focus:border-transparent transition-all text-white placeholder-zinc-500'
								placeholder='••••••••'
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								required
							/>
						</div>

						{/* Submit Button */}
						<button
							type='submit'
							disabled={isLoading}
							className='w-full bg-gradient-to-r from-warm-500 to-warm-600 hover:from-warm-600 hover:to-warm-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95'
						>
							{isLoading ? 'Creating Account...' : 'Create Account'}
						</button>
					</form>

					{/* Divider */}
					<div className='relative my-6'>
						<div className='absolute inset-0 flex items-center'>
							<div className='w-full border-t border-zinc-700'></div>
						</div>
						<div className='relative flex justify-center text-sm'>
							<span className='px-2 bg-zinc-900 text-zinc-500'>
								or continue with
							</span>
						</div>
					</div>

					{/* Google Sign Up */}
					<button
						onClick={() =>
							signIn('google', {
								callbackUrl,
								redirect: true,
							})
						}
						className='w-full flex items-center justify-center gap-2 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 rounded-xl transition-colors'
					>
						<svg
							className='w-5 h-5'
							viewBox='0 0 24 24'
							fill='currentColor'
						>
							<path d='M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.91 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z' />
						</svg>
						Sign up with Google
					</button>

					{/* Sign In Link */}
					<p className='text-center text-zinc-400 text-sm mt-6'>
						Already have an account?{' '}
						<Link
							href='/auth/sign-in'
							className='text-warm-400 hover:text-warm-300 font-semibold transition-colors'
						>
							Sign in here
						</Link>
					</p>
				</div>

				{/* Footer Links */}
				<div className='text-center mt-8 text-xs text-zinc-500'>
					<p>
						By signing up, you agree to our{' '}
						<Link href='#' className='text-warm-400 hover:text-warm-300'>
							Terms
						</Link>
						{' '}and{' '}
						<Link href='#' className='text-warm-400 hover:text-warm-300'>
							Privacy Policy
						</Link>
					</p>
				</div>
			</div>
		</div>
	)
}
