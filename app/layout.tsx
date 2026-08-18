import '../styles/globals.css'
import React from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SiteChrome } from '@/components/shells/SiteChrome'

export const metadata = {
	title: 'Booktrix — Book local services beautifully',
	description: 'Discover and book trusted service businesses across Saint Lucia.',
}

export default async function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const session = await getServerSession(authOptions)

	return (
		<html lang='en-LC'>
			<body>
				<div className='min-h-screen bg-cream-100'>
					<SiteChrome signedIn={Boolean(session)} />
					<main>{children}</main>
				</div>
			</body>
		</html>
	)
}
