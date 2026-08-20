import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SearchFilters } from '@/components/marketplace/SearchFilters'

describe('SearchFilters', () => {
  it('renders labelled URL-backed marketplace filters', () => {
    render(<SearchFilters values={{ q: 'massage', category: 'Wellness', district: 'Castries' }} categories={['Wellness']} />)
    expect(screen.getByRole('search')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /search services/i })).toHaveValue('massage')
    expect(screen.getByRole('combobox', { name: /category/i })).toHaveValue('Wellness')
    expect(screen.getByRole('combobox', { name: /saint lucian location/i })).toHaveValue('Castries')
  })
})
