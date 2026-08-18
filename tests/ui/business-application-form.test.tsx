import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BusinessApplicationForm } from '@/app/for-business/apply/BusinessApplicationForm'

describe('business application form', () => {
	it('collects the required business and owner details', () => {
		render(<BusinessApplicationForm />)
		expect(screen.getByLabelText('Business name')).toBeRequired()
		expect(screen.getByLabelText('Industry')).toBeRequired()
		expect(screen.getByLabelText('Services offered')).toBeRequired()
		expect(screen.getByRole('checkbox', { name: /platform terms/i })).toBeRequired()
		expect(screen.getByRole('button', { name: /submit application/i })).toBeInTheDocument()
	})
})
