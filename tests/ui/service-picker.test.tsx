import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ServicePicker } from '@/components/marketplace/ServicePicker'

const offerings = [
  { id: 'deep-tissue', name: 'Deep tissue massage', description: 'Focused massage care.', durationMinutes: 60, priceCents: 12000, currency: 'XCD' },
]

describe('ServicePicker', () => {
  it('announces selection and enables booking navigation', () => {
    render(<ServicePicker businessSlug="calm" offerings={offerings} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /deep tissue massage/i }))
    expect(screen.getByRole('status')).toHaveTextContent('1 service selected')
    expect(screen.getByRole('link', { name: /book selected service/i })).toHaveAttribute('href', '/book/calm?services=deep-tissue')
  })
})
