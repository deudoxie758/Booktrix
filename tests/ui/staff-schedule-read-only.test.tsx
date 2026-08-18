import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StaffScheduleReadOnly } from '@/components/business/StaffScheduleReadOnly'

describe('StaffScheduleReadOnly', () => {
	it('shows only the staff member’s recurring hours and time off without management controls', () => {
		render(<StaffScheduleReadOnly
			schedules={[{ id: 'schedule-1', weekday: 1, startMinute: 540, endMinute: 1020, location: { name: 'Castries' } }]}
			timeOff={[{ id: 'time-off-1', startsAt: new Date('2026-09-01T09:00:00Z'), endsAt: new Date('2026-09-01T17:00:00Z'), reason: 'Personal appointment', location: { name: 'Castries' } }]}
		/>)

		expect(screen.getByRole('heading', { name: /my recurring hours/i })).toBeVisible()
		expect(screen.getByText(/monday/i)).toBeVisible()
		expect(screen.getByText('09:00–17:00')).toBeVisible()
		expect(screen.getByRole('heading', { name: /my time off/i })).toBeVisible()
		expect(screen.getByText(/personal appointment/i)).toBeVisible()
		expect(screen.queryByRole('button', { name: /save weekly hours|add time off/i })).not.toBeInTheDocument()
		expect(screen.queryByLabelText(/professional|start time|end time/i)).not.toBeInTheDocument()
	})
})
