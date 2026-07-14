import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
	const session = await getServerSession(authOptions)
	const role = (session?.user as any)?.role
	if (role === 'ADMIN') {
		redirect('/admin')
	}
	const spas = await prisma.spa.findMany({
		include: {
			Services: {
				include: {
					Subservices: true,
				},
			},
			_count: {
				select: {
					Employees: true,
				},
			},
		},
	})

	return (
		<div className='min-h-screen bg-gradient-to-b from-nude-50 via-white to-warm-50'>
			{/* Hero Section */}
			<div className='relative overflow-hidden bg-gradient-to-br from-warm-900 via-nude-900 to-warm-800'>
				{/* Decorative Elements */}
				<div className='absolute inset-0 opacity-10'>
					<div className='absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl'></div>
					<div className='absolute bottom-20 right-10 w-96 h-96 bg-warm-300 rounded-full blur-3xl'></div>
				</div>

				{/* Hero Content */}
				<div className='relative max-w-7xl mx-auto px-6 py-24 sm:py-32'>
					<div className='grid lg:grid-cols-2 gap-12 items-center'>
						{/* Left: Text Content */}
						<div className='text-white'>
							<div className='inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6 border border-white/20'>
								<svg
									className='w-4 h-4'
									fill='currentColor'
									viewBox='0 0 20 20'
								>
									<path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
								</svg>
								<span className='text-sm font-medium tracking-wide'>
									Saint Lucia's Premier Booking Platform
								</span>
							</div>

							<h1 className='text-5xl sm:text-6xl lg:text-7xl font-serif font-light mb-6 leading-tight'>
								Escape Into
								<span className='block text-warm-200'>Pure Bliss</span>
							</h1>

							<p className='text-lg sm:text-xl text-warm-100 mb-8 leading-relaxed max-w-xl'>
									Discover world-class wellness treatments and rejuvenating experiences
								facials—your perfect escape awaits.
							</p>

							<div className='flex flex-wrap gap-4'>
								<a
									href='#services'
									className='px-8 py-4 bg-white text-warm-900 rounded-full font-semibold hover:bg-warm-50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105'
								>
									Explore
								</a>
								<a
									href='#contact'
									className='px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-full font-semibold hover:bg-white/20 transition-all duration-300'
								>
									Get in Touch
								</a>
							</div>

							{/* Stats */}
							<div className='grid grid-cols-3 gap-8 mt-12 pt-12 border-t border-white/20'>
								<div>
									<div className='text-3xl font-bold text-white mb-1'>
										{spas.length}+
									</div>
									<div className='text-sm text-warm-200'>Premium Spas</div>
								</div>
								<div>
									<div className='text-3xl font-bold text-white mb-1'>50+</div>
									<div className='text-sm text-warm-200'>Treatments</div>
								</div>
								<div>
									<div className='text-3xl font-bold text-white mb-1'>
										1000+
									</div>
									<div className='text-sm text-warm-200'>Happy Guests</div>
								</div>
							</div>
						</div>

						{/* Right: Image Grid */}
						<div className='hidden lg:grid grid-cols-2 gap-4'>
							<div className='space-y-4'>
								<div className='h-48 rounded-2xl overflow-hidden shadow-2xl'>
									<img
										src='https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop&q=80'
										alt='Spa massage treatment'
										className='w-full h-full object-cover'
									/>
								</div>
								<div className='h-64 rounded-2xl overflow-hidden shadow-2xl'>
									<img
										src='https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400&h=400&fit=crop&q=80'
										alt='Hair salon styling'
										className='w-full h-full object-cover'
									/>
								</div>
							</div>
							<div className='space-y-4 mt-8'>
								<div className='h-64 rounded-2xl overflow-hidden shadow-2xl'>
									<img
										src='https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop&q=80'
										alt='Nail care and beauty'
										className='w-full h-full object-cover'
									/>
								</div>
								<div className='h-48 rounded-2xl overflow-hidden shadow-2xl'>
									<img
										src='https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&q=80'
										alt='Wellness and relaxation'
										className='w-full h-full object-cover'
									/>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Featured Wellness Services */}
			<div id='services' className='max-w-7xl mx-auto px-6 py-20'>
				<div className='mb-12 text-center'>
					<h2 className='text-sm font-semibold text-warm-600 tracking-wider mb-4'>
						FEATURED SERVICES
					</h2>
					<h3 className='text-4xl sm:text-5xl font-serif font-light text-gray-900 mb-4'>
						Discover What's Perfect For You
					</h3>
					<p className='text-lg text-gray-600 max-w-2xl mx-auto'>
						Discover exceptional wellness locations and treatments a
					</p>
				</div>

				<div className='grid md:grid-cols-2 lg:grid-cols-3 gap-8'>
					{spas.slice(0, 9).map((spa) => (
						<Link
							key={spa.id}
							href={`/s/${spa.slug}`}
							className='group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1'
						>
							{/* Card Image */}
							<div className='h-48 relative overflow-hidden'>
								<img
									src={
										spa.coverUrl ||
										'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=500&h=300&fit=crop'
									}
									alt={spa.name}
									className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-300'
								/>
								<div className='absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity'></div>
								<div className='absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4'>
									<div className='flex items-center gap-2 text-white text-sm'>
										<svg
											className='w-4 h-4'
											fill='currentColor'
											viewBox='0 0 20 20'
										>
											<path
												fillRule='evenodd'
												d='M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z'
												clipRule='evenodd'
											/>
										</svg>
										<span className='text-xs opacity-90'>
											{spa.address?.split(',')[1] || 'Saint Lucia'}
										</span>
									</div>
								</div>
							</div>

							{/* Card Content */}
							<div className='p-6'>
								<h3 className='text-xl font-bold text-gray-900 mb-2 group-hover:text-warm-600 transition-colors'>
									{spa.name}
								</h3>
								<p className='text-gray-600 text-sm mb-4 line-clamp-2'>
									{spa.description}
								</p>

								{/* Stats */}
								<div className='flex items-center gap-4 text-sm text-gray-500 mb-4'>
									<div className='flex items-center gap-1'>
										<svg
											className='w-4 h-4'
											fill='currentColor'
											viewBox='0 0 20 20'
										>
											<path d='M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z' />
										</svg>
										<span>
											{spa.Services.length} service
											{spa.Services.length !== 1 ? 's' : ''}
										</span>
									</div>
									<div className='flex items-center gap-1'>
										<svg
											className='w-4 h-4'
											fill='currentColor'
											viewBox='0 0 20 20'
										>
											<path d='M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z' />
										</svg>
										<span>
											{spa._count.Employees} therapist
											{spa._count.Employees !== 1 ? 's' : ''}
										</span>
									</div>
								</div>

								{/* Price Range */}
								<div className='mb-4'>
									<div className='text-xs text-gray-500 mb-1'>
										Starting from
									</div>
									<div className='text-2xl font-bold text-warm-600'>
										$
										{Math.min(
											...spa.Services.flatMap((s) =>
												s.Subservices.map((ss) => ss.priceCents / 100),
											),
										).toFixed(0)}
									</div>
								</div>

								{/* CTA Button */}
								<div className='flex items-center justify-between pt-4 border-t border-gray-100'>
									<span className='text-sm font-medium text-warm-600 group-hover:text-warm-700'>
										View Details & Book
									</span>
									<svg
										className='w-5 h-5 text-warm-600 group-hover:translate-x-1 transition-transform'
										fill='none'
										stroke='currentColor'
										viewBox='0 0 24 24'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M9 5l7 7-7 7'
										/>
									</svg>
								</div>
							</div>
						</Link>
					))}
				</div>

				{/* View All Button */}
				{spas.length > 9 && (
					<div className='mt-12 text-center'>
						<Link
							href='/spas'
							className='inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-warm-400 to-nude-400 text-white rounded-full font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300'
						>
							View All {spas.length} Locations
							<svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
								<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
							</svg>
						</Link>
					</div>
				)}

				{spas.length === 0 && (
					<div className='text-center py-12 bg-white rounded-2xl shadow'>
						<div className='text-gray-400 mb-4'>
							<svg
								className='w-16 h-16 mx-auto'
								fill='none'
								stroke='currentColor'
								viewBox='0 0 24 24'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
									d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
								/>
							</svg>
						</div>
						<h3 className='text-xl font-semibold text-gray-700 mb-2'>
								No Wellness Services Available Yet
						</h3>
						<p className='text-gray-500'>
							Run the seed script to add sample data.
						</p>
					</div>
				)}
			</div>

			{/* Contact Section - Moved to Footer */}
			<div id='contact' className='mt-20 bg-warm-50 border-t border-warm-100'>
				<div className='max-w-7xl mx-auto px-6 py-16'>
					<div className='grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12'>
						{/* Brand */}
						<div>
							<h3 className='text-2xl font-serif text-warm-900 mb-4'>BOOKTRIX</h3>
							<p className='text-gray-600 text-sm leading-relaxed mb-4'>
								Saint Lucia's premier wellness booking platform. Discover
								tranquility, book wellness.
							</p>
							<div className='flex gap-3'>
								<a
									href='https://instagram.com'
									target='_blank'
									rel='noopener noreferrer'
									className='w-10 h-10 bg-warm-200 hover:bg-warm-300 rounded-full flex items-center justify-center transition-colors text-warm-900'
								>
									<svg
										className='w-5 h-5'
										fill='currentColor'
										viewBox='0 0 24 24'
									>
										<path d='M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z' />
									</svg>
								</a>
								<a
									href='https://facebook.com'
									target='_blank'
									rel='noopener noreferrer'
									className='w-10 h-10 bg-warm-200 hover:bg-warm-300 rounded-full flex items-center justify-center transition-colors text-warm-900'
								>
									<svg
										className='w-5 h-5'
										fill='currentColor'
										viewBox='0 0 24 24'
									>
										<path d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' />
									</svg>
								</a>
								<a
									href='https://twitter.com'
									target='_blank'
									rel='noopener noreferrer'
									className='w-10 h-10 bg-warm-200 hover:bg-warm-300 rounded-full flex items-center justify-center transition-colors text-warm-900'
								>
									<svg
										className='w-5 h-5'
										fill='currentColor'
										viewBox='0 0 24 24'
									>
										<path d='M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z' />
									</svg>
								</a>
							</div>
						</div>

						{/* Quick Links */}
						<div>
							<h4 className='font-semibold text-gray-900 mb-4'>Quick Links</h4>
							<ul className='space-y-3'>
								<li>
									<a
										href='#services'
										className='text-gray-600 hover:text-warm-600 transition-colors text-sm'
									>
										Browse
									</a>
								</li>
								<li>
									<a
										href='#'
										className='text-gray-600 hover:text-warm-600 transition-colors text-sm'
									>
										Partner With Us
									</a>
								</li>
								<li>
									<a
										href='#'
										className='text-gray-600 hover:text-warm-600 transition-colors text-sm'
									>
										Gift Certificates
									</a>
								</li>
							</ul>
						</div>

						{/* Contact Info */}
						<div>
							<h4 className='font-semibold text-gray-900 mb-4'>Get in Touch</h4>
							<ul className='space-y-3 text-sm text-gray-600'>
								<li className='flex items-start gap-2'>
									<svg
										className='w-5 h-5 text-warm-600 flex-shrink-0 mt-0.5'
										fill='none'
										stroke='currentColor'
										viewBox='0 0 24 24'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
										/>
									</svg>
									<a
										href='mailto:hello@booktrix.lc'
										className='hover:text-warm-600 transition-colors'
									>
										hello@booktrix.lc
									</a>
								</li>
								<li className='flex items-start gap-2'>
									<svg
										className='w-5 h-5 text-warm-600 flex-shrink-0 mt-0.5'
										fill='none'
										stroke='currentColor'
										viewBox='0 0 24 24'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z'
										/>
									</svg>
									<a
										href='tel:+17585550300'
										className='hover:text-warm-600 transition-colors'
									>
										+1 (758) 555-0300
									</a>
								</li>
								<li className='flex items-start gap-2'>
									<svg
										className='w-5 h-5 text-warm-600 flex-shrink-0 mt-0.5'
										fill='none'
										stroke='currentColor'
										viewBox='0 0 24 24'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'
										/>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M15 11a3 3 0 11-6 0 3 3 0 016 0z'
										/>
									</svg>
									<span>Rodney Bay, Saint Lucia</span>
								</li>
							</ul>
						</div>

						{/* Newsletter */}
						<div>
							<h4 className='font-semibold text-gray-900 mb-4'>Stay Updated</h4>
							<p className='text-sm text-gray-600 mb-4'>
								Get wellness tips and exclusive offers
							</p>
							<form className='space-y-2'>
								<input
									type='email'
									placeholder='Your email'
									className='w-full px-4 py-2 rounded-lg border border-warm-200 focus:outline-none focus:ring-2 focus:ring-warm-400 text-sm'
								/>
								<button
									type='submit'
									className='w-full bg-warm-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-warm-700 transition-colors text-sm'
								>
									Subscribe
								</button>
							</form>
						</div>
					</div>

					{/* Bottom Bar */}
					<div className='pt-8 border-t border-warm-200 text-center text-sm text-gray-500'>
						<p>
							&copy; {new Date().getFullYear()} BOOKTRIX Booking. All rights
							reserved.
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}
