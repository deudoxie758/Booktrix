'use client'

import Link from 'next/link'
import { useState } from 'react'
import { handleSignOut } from '@/lib/signout'

export default function Navigation({ session }: { session: any }) {
	const [isMenuOpen, setIsMenuOpen] = useState(false)
	const userRole = (session?.user as any)?.role
	const isAdmin = userRole === 'ADMIN'
	const userInitial = session?.user?.name?.[0] || session?.user?.email?.[0]?.toUpperCase() || 'U'

	const handleSignOutClick = async () => {
		await handleSignOut()
	}

	return (
		<header className='bg-white sticky top-0 z-50 shadow-sm'>
			<div className='max-w-7xl mx-auto px-6'>
				<div className='flex items-center justify-between py-4'>
					<Link href={isAdmin ? '/admin' : '/dashboard'} className='flex items-center gap-3'>
						<svg
							className='w-12 h-12 text-warm-600'
							viewBox='0 0 200 180'
							fill='none'
							stroke='currentColor'
							strokeWidth='4'
							strokeLinecap='round'
							strokeLinejoin='round'
						>
							<path d='M100 150 Q100 100 100 80 Q100 100 100 150' fill='currentColor' stroke='none' />
							<path d='M100 150 Q85 120 75 80 Q75 60 85 50 Q90 80 100 90 Z' fill='currentColor' stroke='currentColor' />
							<path d='M100 150 Q115 120 125 80 Q125 60 115 50 Q110 80 100 90 Z' fill='currentColor' stroke='currentColor' />
							<path d='M85 140 Q70 110 55 70 Q50 45 60 30 Q70 65 85 85' />
							<path d='M115 140 Q130 110 145 70 Q150 45 140 30 Q130 65 115 85' />
							<path d='M75 135 Q55 105 35 60 Q25 30 40 15 Q55 55 75 80' />
							<path d='M125 135 Q145 105 165 60 Q175 30 160 15 Q145 55 125 80' />
							<path d='M70 120 Q45 100 20 70 Q5 50 10 25 Q30 60 60 85' />
							<path d='M130 120 Q155 100 180 70 Q195 50 190 25 Q170 60 140 85' />
							<path d='M60 140 Q80 155 100 155 Q120 155 140 140' strokeWidth='3' />
						</svg>
						<div>
							<div className='text-2xl font-bold text-gray-900'>Booktrix</div>
							<div className='text-xs text-gray-500 -mt-1'>Service Center</div>
						</div>
					</Link>

					<nav className='hidden lg:flex items-center gap-8'>
						{!isAdmin && (
							<>
								<Link href='/dashboard' className='text-gray-900 hover:text-warm-600 font-medium transition-colors relative group'>
									HOME
									<span className='absolute bottom-0 left-0 w-0 h-0.5 bg-warm-600 group-hover:w-full transition-all duration-300'></span>
								</Link>
								<a href='#contact' className='text-gray-900 hover:text-warm-600 font-medium transition-colors relative group'>
									CONTACT
									<span className='absolute bottom-0 left-0 w-0 h-0.5 bg-warm-600 group-hover:w-full transition-all duration-300'></span>
								</a>

								<div className='flex items-center gap-3 ml-2'>
									<a href='https://instagram.com' target='_blank' rel='noopener noreferrer' className='text-gray-400 hover:text-warm-600 transition-colors' aria-label='Instagram'>
										<svg className='w-5 h-5' fill='currentColor' viewBox='0 0 24 24'>
											<path d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' />
										</svg>
									</a>
									<a href='https://facebook.com' target='_blank' rel='noopener noreferrer' className='text-gray-400 hover:text-warm-600 transition-colors' aria-label='Facebook'>
										<svg className='w-5 h-5' fill='currentColor' viewBox='0 0 24 24'>
											<path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' />
										</svg>
									</a>
									<a href='https://twitter.com' target='_blank' rel='noopener noreferrer' className='text-gray-400 hover:text-warm-600 transition-colors' aria-label='Twitter'>
										<svg className='w-5 h-5' fill='currentColor' viewBox='0 0 24 24'>
											<path d='M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z' />
										</svg>
									</a>
								</div>

								{!session ? (
									<Link href='/join-us' className='bg-warm-600 hover:bg-warm-700 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-colors shadow-md hover:shadow-lg'>
										JOIN US
									</Link>
								) : userRole === 'USER' ? (
									<Link href='#services' className='bg-warm-600 hover:bg-warm-700 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-colors shadow-md hover:shadow-lg'>
										BOOK NOW
									</Link>
								) : null}
							</>
						)}

						{session && (
							<div className='relative group ml-4'>
								<button className='flex items-center gap-2 text-gray-700 hover:text-warm-600'>
									<div className='h-9 w-9 bg-gradient-to-br from-warm-400 to-nude-500 rounded-full flex items-center justify-center text-white text-sm font-semibold'>
										{userInitial}
									</div>
								</button>

								<div className='absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-gray-100'>
									<div className='px-4 py-3 border-b border-gray-100'>
										<div className='text-sm font-medium text-gray-900'>{session?.user?.name}</div>
										<div className='text-xs text-gray-500'>{session?.user?.email}</div>
									</div>

									{!isAdmin ? (
										<>
											<Link href='/profile' className='block px-4 py-2 text-sm text-gray-700 hover:bg-warm-50 hover:text-warm-600'>My Bookings</Link>
											<Link href='/profile/notifications' className='block px-4 py-2 text-sm text-gray-700 hover:bg-warm-50 hover:text-warm-600'>Notifications</Link>
											<Link href='/support' className='block px-4 py-2 text-sm text-gray-700 hover:bg-warm-50 hover:text-warm-600'>Support & Help</Link>
											<Link href='/search' className='block px-4 py-2 text-sm text-gray-700 hover:bg-warm-50 hover:text-warm-600'>Search Locations</Link>
											{userRole === 'OWNER' && (
												<div className='border-t border-gray-100 mt-2 pt-2'>
													<Link href='/manager' className='block px-4 py-2 text-sm text-gray-700 hover:bg-warm-50 hover:text-warm-600'>Manager Dashboard</Link>
													<Link href='/manager/support' className='block px-4 py-2 text-sm text-gray-700 hover:bg-warm-50 hover:text-warm-600'>Support Tickets</Link>
												</div>
											)}
										</>
									) : (
										<div className='px-4 py-2 text-sm text-gray-700'>Admin access</div>
									)}

									<button onClick={handleSignOutClick} className='block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 mt-2 pt-2'>
										Sign Out
									</button>
								</div>
							</div>
						)}
					</nav>

					<button onClick={() => setIsMenuOpen(!isMenuOpen)} className='lg:hidden p-2 text-gray-700 hover:text-warm-600'>
						<svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
							{isMenuOpen ? (
								<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
							) : (
								<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 6h16M4 12h16M4 18h16' />
							)}
						</svg>
					</button>
				</div>

				{isMenuOpen && (
					<div className='lg:hidden py-4 border-t border-gray-200'>
						<nav className='space-y-2'>
							{!isAdmin && (
								<>
									<Link href='/dashboard' className='block px-4 py-2 text-gray-700 hover:bg-warm-50 hover:text-warm-600 rounded-lg font-medium' onClick={() => setIsMenuOpen(false)}>HOME</Link>
									<a href='#contact' className='block px-4 py-2 text-gray-700 hover:bg-warm-50 hover:text-warm-600 rounded-lg font-medium' onClick={() => setIsMenuOpen(false)}>CONTACT</a>
								</>
							)}

							{session && (
								<>
									{!isAdmin && (
										<>
											<Link href='/profile' className='block px-4 py-2 text-gray-700 hover:bg-warm-50 hover:text-warm-600 rounded-lg' onClick={() => setIsMenuOpen(false)}>My Bookings</Link>
											{userRole === 'OWNER' && (
												<Link href='/manager' className='block px-4 py-2 text-gray-700 hover:bg-warm-50 hover:text-warm-600 rounded-lg' onClick={() => setIsMenuOpen(false)}>Manager Dashboard</Link>
											)}
										</>
									)}
									<div className='px-4 py-2 border-t border-gray-200 mt-2'>
										<div className='text-sm font-medium text-gray-900 mb-1'>{session?.user?.name}</div>
										<div className='text-xs text-gray-500 mb-3'>{session?.user?.email}</div>
										<button onClick={handleSignOutClick} className='w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg'>Sign Out</button>
									</div>
								</>
							)}
						</nav>
					</div>
				)}
			</div>
		</header>
	)
}
