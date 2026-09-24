import { findAvailableStarts } from './availability'
import type { AvailabilityProfessional, RequestedService, TimeInterval } from './types'

type DateWindow = TimeInterval & { date: string }

export function summarizeAvailableDates(input: {
  dates: DateWindow[]
  now: Date
  minimumNoticeMinutes: number
  maximumAdvanceBookingDays: number
  services: RequestedService[]
  professionals: AvailabilityProfessional[]
  locationHours: TimeInterval[]
}) {
  const earliest = input.now.getTime() + input.minimumNoticeMinutes * 60_000
  const latest = input.now.getTime() + input.maximumAdvanceBookingDays * 86_400_000

  return input.dates.flatMap((date) => {
    if (date.start.getTime() > latest || date.end.getTime() < earliest) return []
    const window = {
      start: new Date(Math.max(date.start.getTime(), earliest)),
      end: new Date(Math.min(date.end.getTime(), latest + 1)),
    }
    if (window.start >= window.end) return []
    const hasSlot = findAvailableStarts({
      window,
      services: input.services,
      professionals: input.professionals,
      locationHours: input.locationHours,
    }).length > 0
    return hasSlot ? [date.date] : []
  })
}
