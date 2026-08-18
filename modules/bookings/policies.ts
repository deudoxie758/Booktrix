import type { SegmentStatus } from './types'

export function canCustomerCancel(input: { status: SegmentStatus; startsAt: Date; now: Date; leadMinutes: number }) {
  if (!['REQUESTED', 'CONFIRMED'].includes(input.status)) return false
  return input.startsAt.getTime() - input.now.getTime() >= input.leadMinutes * 60_000
}
