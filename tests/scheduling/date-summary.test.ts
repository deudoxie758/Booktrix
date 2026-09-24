import { describe, expect, it } from 'vitest'

import { summarizeAvailableDates } from '@/modules/scheduling/date-summary'

const day = (date: string) => ({ date, start: new Date(`${date}T00:00:00.000Z`), end: new Date(`${date}T23:59:59.999Z`) })
const service = { offeringId: 'service-1', durationMinutes: 60, preparationMinutes: 0, cleanupMinutes: 0, attendeeCount: 1, capacity: 1 }
const professional = (overrides: Record<string, unknown> = {}) => ({
  membershipId: 'member-1', qualifiedOfferingIds: ['service-1'],
  working: [{ start: new Date('2026-10-01T09:00:00.000Z'), end: new Date('2026-10-03T17:00:00.000Z') }],
  timeOff: [], occupied: [], ...overrides,
})

describe('summarizeAvailableDates', () => {
  it('returns only days with a complete available service sequence', () => {
    const dates = [day('2026-10-01'), day('2026-10-02'), day('2026-10-03')]
    expect(summarizeAvailableDates({
      dates, now: new Date('2026-10-01T08:00:00.000Z'), minimumNoticeMinutes: 0, maximumAdvanceBookingDays: 30,
      services: [service], professionals: [professional({ timeOff: [{ start: dates[1]!.start, end: dates[1]!.end }] })],
      locationHours: [{ start: dates[0]!.start, end: dates[0]!.end }, { start: dates[1]!.start, end: dates[1]!.end }],
    })).toEqual(['2026-10-01'])
  })

  it('excludes slots inside minimum notice and beyond maximum advance', () => {
    const dates = [day('2026-10-01'), day('2026-10-02'), day('2026-10-03')]
    expect(summarizeAvailableDates({
      dates, now: new Date('2026-10-01T08:30:00.000Z'), minimumNoticeMinutes: 120, maximumAdvanceBookingDays: 1,
      services: [service], professionals: [professional()], locationHours: [{ start: dates[0]!.start, end: dates[2]!.end }],
    })).toEqual(['2026-10-01', '2026-10-02'])
  })

  it('excludes fully occupied dates', () => {
    const target = day('2026-10-01')
    expect(summarizeAvailableDates({
      dates: [target], now: new Date('2026-09-30T00:00:00.000Z'), minimumNoticeMinutes: 0, maximumAdvanceBookingDays: 30,
      services: [service], professionals: [professional({ occupied: [{ start: new Date('2026-10-01T00:00:00.000Z'), end: new Date('2026-10-02T00:00:00.000Z') }] })],
      locationHours: [{ start: target.start, end: target.end }],
    })).toEqual([])
  })
})
