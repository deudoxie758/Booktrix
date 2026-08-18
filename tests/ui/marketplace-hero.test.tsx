import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MarketplaceHero } from '@/components/marketplace/MarketplaceHero'

describe('marketplace hero', () => {
	it('invites visitors to discover services without requiring sign in', () => {
		render(<MarketplaceHero />)
		expect(screen.getByRole('heading', { name: /feel-good moment/i })).toBeInTheDocument()
		expect(screen.getByRole('link', { name: /explore services/i })).toHaveAttribute('href', '/search')
	})
})
