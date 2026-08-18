import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCustomerStats } from './actions'
import { CancelBookingButton, RescheduleBookingButton } from './components'
import { formatBookingServiceNames } from '@/lib/booking'
import RedeemPoints from './RedeemPoints'

export default async function ProfilePage() {
	const session = await getServerSession(authOptions)

	if (!session?.user) {
		redirect('/auth/sign-in')
	}

	const user = await prisma.user.findUnique({
		where: { email: session.user.email! },
		include: {
			Bookings: {
				include: {
					spa: true,
					subservice: {
						include: {
							service: true,
						},
					},
					BookingItems: {
						include: {
							subservice: {
								include: {
									service: true,
								},
							},
						},
						orderBy: { orderIndex: 'asc' },
					},
					employee: true,
				},
				orderBy: {
					start: 'desc',
				},
			},
		},
	})

	if (!user) {
		redirect('/auth/sign-in')
	}

	// Get customer statistics
	const statsResult = await getCustomerStats(user.id)
	const stats = statsResult.ok ? statsResult.stats : null

	const upcomingBookings = user.Bookings.filter(
		(b) => new Date(b.start) > new Date() && b.status !== 'CANCELLED'
	)
	const pastBookings = user.Bookings.filter(
		(b) => new Date(b.start) <= new Date() || b.status === 'CANCELLED'
	)

	return (
		<div className='min-h-screen bg-gray-50'>
			<div className='max-w-6xl mx-auto px-6 py-8'>
				<Link href='/profile/bookings' className='mb-6 flex items-center justify-between rounded-2xl bg-cocoa-900 px-6 py-5 text-white shadow-lg transition hover:bg-cocoa-800'>
					<span><span className='block text-xs font-bold uppercase tracking-[.16em] text-sand-200'>Booktrix booking center</span><span className='mt-1 block text-xl font-semibold'>View and manage your bookings</span></span>
					<span aria-hidden='true' className='text-2xl'>→</span>
				</Link>
				{/* Profile Header */}
				<div className='bg-white rounded-2xl shadow-lg p-8 mb-8'>
					<div className='flex items-start justify-between'>
						<div className='flex items-center gap-6'>
							<div className='h-24 w-24 rounded-full bg-gradient-to-br from-warm-400 to-nude-500 flex items-center justify-center text-white text-3xl font-bold'>
								{user.name?.[0] || user.email[0].toUpperCase()}
							</div>
							<div>
								<h1 className='text-3xl font-bold text-gray-900 mb-1'>
									{user.name || 'User'}
								</h1>
								<p className='text-gray-600 mb-2'>{user.email}</p>
								<div className='inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-warm-100 text-warm-800 gap-3'>
									<span>{user.role}</span>
									<span className='text-xs bg-white px-2 py-1 rounded-full text-warm-700 font-semibold'>Points: {user.points}</span>
								</div>
							</div>
						</div>
						<Link
							href='/dashboard'
							className='px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
						>
							← Back to Dashboard
						</Link>
					</div>
				</div>

				{/* Customer Statistics */}
				{stats && (
					<div className='bg-white rounded-2xl shadow-lg p-6 mb-8'>
						<h2 className='text-2xl font-bold text-gray-900 mb-6'>
							Your Wellness Journey
						</h2>

						{/* Stats Grid */}
						<div className='grid grid-cols-2 md:grid-cols-4 gap-6 mb-6'>
							<div className='text-center p-4 bg-gradient-to-br from-warm-50 to-nude-50 rounded-xl'>
								<div className='text-3xl font-bold text-warm-600 mb-1'>
									{stats.totalBookings}
								</div>
								<div className='text-sm text-gray-600'>Total Bookings</div>
							</div>
							<div className='text-center p-4 bg-gradient-to-br from-warm-50 to-nude-50 rounded-xl'>
								<div className='text-3xl font-bold text-warm-600 mb-1'>
									{stats.completedBookings}
								</div>
								<div className='text-sm text-gray-600'>Completed</div>
							</div>
							<div className='text-center p-4 bg-gradient-to-br from-warm-50 to-nude-50 rounded-xl'>
								<div className='text-3xl font-bold text-warm-600 mb-1'>
									{stats.upcomingBookings}
								</div>
								<div className='text-sm text-gray-600'>Upcoming</div>
							</div>
							<div className='text-center p-4 bg-gradient-to-br from-warm-50 to-nude-50 rounded-xl'>
								<div className='text-3xl font-bold text-warm-600 mb-1'>
									${(stats.totalSpent / 100).toFixed(0)}
								</div>
								<div className='text-sm text-gray-600'>Total Spent</div>
							</div>
						</div>

						<div className='grid md:grid-cols-2 gap-6'>
							{/* Favorite Services */}
							{stats.favoriteServices.length > 0 && (
								<div className='p-4 bg-warm-50 rounded-xl'>
									<h3 className='font-semibold text-gray-900 mb-3'>
										Favorite Services
									</h3>
									<div className='space-y-2'>
										{stats.favoriteServices.map((service, idx) => (
											<div
												key={idx}
												className='flex items-center justify-between text-sm'
											>
												<span className='text-gray-700'>{service.name}</span>
												<span className='font-medium text-warm-600'>
													{service.count} times
												</span>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Preferred Therapists */}
							{stats.preferredTherapists.length > 0 && (
								<div className='p-4 bg-warm-50 rounded-xl'>
									<h3 className='font-semibold text-gray-900 mb-3'>
										Preferred Therapists
									</h3>
									<div className='space-y-2'>
										{stats.preferredTherapists.map((therapist, idx) => (
											<div
												key={idx}
												className='flex items-center justify-between text-sm'
											>
												<span className='text-gray-700'>{therapist.name}</span>
												<span className='font-medium text-warm-600'>
													{therapist.count} sessions
												</span>
											</div>
										))}
									</div>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Bookings Section */}
				<div className='space-y-8'>
					{/* Upcoming Bookings */}
					<div>
						<h2 className='text-2xl font-bold text-gray-900 mb-4'>
							Upcoming Appointments
						</h2>
						{upcomingBookings.length > 0 ? (
							<div className='space-y-4'>
								{upcomingBookings.map((booking) => (
									<div
										key={booking.id}
										className='bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow'
									>
										<div className='flex items-start justify-between'>
											<div className='flex-1'>
												<div className='flex items-center gap-3 mb-3'>
													<h3 className='text-xl font-semibold text-gray-900'>
														{booking.spa.name}
													</h3>
													<span
														className={`px-3 py-1 rounded-full text-xs font-medium ${
															booking.status === 'CONFIRMED'
																? 'bg-warm-100 text-warm-800'
																: booking.status === 'PENDING'
																? 'bg-yellow-100 text-yellow-800'
																: 'bg-red-100 text-red-800'
														}`}
													>
														{booking.status}
													</span>
												</div>
												<div className='space-y-2 text-sm text-gray-600'>
													<div className='flex items-center gap-2'>
														<svg
															className='w-4 h-4'
															fill='none'
															stroke='currentColor'
															viewBox='0 0 24 24'
														>
															<path
																strokeLinecap='round'
																strokeLinejoin='round'
																strokeWidth={2}
																d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
															/>
														</svg>
														<span>
															{new Date(booking.start).toLocaleDateString(
																'en-US',
																{
																	weekday: 'long',
																	year: 'numeric',
																	month: 'long',
																	day: 'numeric',
																}
															)}
														</span>
													</div>
													<div className='flex items-center gap-2'>
														<svg
															className='w-4 h-4'
															fill='none'
															stroke='currentColor'
															viewBox='0 0 24 24'
														>
															<path
																strokeLinecap='round'
																strokeLinejoin='round'
																strokeWidth={2}
																d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
															/>
														</svg>
														<span>
															{new Date(booking.start).toLocaleTimeString(
																'en-US',
																{
																	hour: '2-digit',
																	minute: '2-digit',
																}
															)}{' '}
															-{' '}
															{new Date(booking.end).toLocaleTimeString(
																'en-US',
																{
																	hour: '2-digit',
																	minute: '2-digit',
																}
															)}
														</span>
													</div>
													<div className='flex items-center gap-2'>
														<svg
															className='w-4 h-4'
															fill='none'
															stroke='currentColor'
															viewBox='0 0 24 24'
														>
															<path
																strokeLinecap='round'
																strokeLinejoin='round'
																strokeWidth={2}
																d='M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
															/>
														</svg>
														<span className='font-medium'>
															{formatBookingServiceNames(booking)}
														</span>
													</div>
													{booking.employee && (
														<div className='flex items-center gap-2'>
															<svg
																className='w-4 h-4'
																fill='none'
																stroke='currentColor'
																viewBox='0 0 24 24'
															>
																<path
																	strokeLinecap='round'
																	strokeLinejoin='round'
																	strokeWidth={2}
																	d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
																/>
															</svg>
															<span>With {booking.employee.name}</span>
														</div>
													)}
													{booking.notes && (
														<div className='rounded-lg bg-warm-50 px-3 py-2 text-xs text-gray-600'>
															Notes: {booking.notes}
														</div>
													)}
												</div>
											</div>
											<div className='text-right'>
												<div className='text-2xl font-bold text-gray-900 mb-1'>
													${(booking.totalCents / 100).toFixed(2)}
												</div>
												<div className='text-sm text-gray-500'>
													{booking.paymentStatus}
												</div>
											</div>
										</div>

										{/* Action Buttons */}
										<div className='flex gap-3 mt-4 pt-4 border-t border-gray-200'>
											<RescheduleBookingButton booking={booking} />
											<CancelBookingButton booking={booking} />
										</div>
									</div>
								))}
							</div>
						) : (
							<div className='bg-white rounded-xl shadow p-12 text-center'>
								<svg
									className='w-16 h-16 mx-auto text-gray-300 mb-4'
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
									/>
								</svg>
								<h3 className='text-lg font-medium text-gray-900 mb-2'>
									No upcoming appointments
								</h3>
								<p className='text-gray-500 mb-6'>
									Book your first spa treatment today
								</p>
								<Link
									href='/dashboard'
									className='inline-block px-6 py-3 bg-gradient-to-r from-warm-400 to-nude-400 text-white rounded-lg hover:opacity-90 transition-opacity'
								>
									Browse Spas
								</Link>
							</div>
						)}
					</div>

					{/* Past Bookings */}
					{pastBookings.length > 0 && (
						<div>
							<h2 className='text-2xl font-bold text-gray-900 mb-4'>
								Booking History
							</h2>
							<div className='space-y-4'>
								{pastBookings.map((booking) => (
									<div
										key={booking.id}
										className='bg-white rounded-xl shadow p-6 opacity-75'
									>
										<div className='flex items-start justify-between'>
											<div className='flex-1'>
												<h3 className='text-lg font-semibold text-gray-900 mb-2'>
													{booking.spa.name}
												</h3>
												<div className='space-y-1 text-sm text-gray-600'>
													<div>
														{new Date(booking.start).toLocaleDateString(
															'en-US',
															{
																year: 'numeric',
																month: 'long',
																day: 'numeric',
															}
														)}
													</div>
													<div>
														{formatBookingServiceNames(booking)}
													</div>
												</div>
											</div>
											<div className='text-right'>
												<div className='text-lg font-semibold text-gray-900'>
													${(booking.totalCents / 100).toFixed(2)}
												</div>
												<div className='text-xs text-gray-500'>
													{booking.status}
												</div>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Redeem Points */}
				<div className='mt-4'>
					<RedeemPoints currentPoints={user.points} />
				</div>
			</div>
		</div>
	)
}
