import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PublicHeader } from '@/components/shells/PublicHeader'

describe('PublicHeader', () => {
  it('always sends a signed-in person to their account hub', () => {
    render(<PublicHeader signedIn />)
    expect(screen.getByRole('link', { name: /my account/i })).toHaveAttribute('href', '/profile')
  })
})
