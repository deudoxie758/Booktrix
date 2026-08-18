import { describe, expect, it } from 'vitest'

import { buildServiceSequence, findAvailableStarts } from '@/modules/scheduling/availability'

const iso = (hour: number, minute = 0) => new Date(Date.UTC(2026, 7, 20, hour, minute))

describe('availability', () => {
  it('excludes buffers, time off, and existing occupied segments', () => {
    const starts = findAvailableStarts({
      window: { start: iso(13), end: iso(18) },
      incrementMinutes: 15,
      services: [{ offeringId: 'service-1', durationMinutes: 60, preparationMinutes: 15, cleanupMinutes: 15, attendeeCount: 1, capacity: 1 }],
      professionals: [
        {
          membershipId: 'member-1',
          working: [{ start: iso(13), end: iso(18) }],
          timeOff: [{ start: iso(13), end: iso(14) }],
          occupied: [{ start: iso(15, 30), end: iso(17) }],
          qualifiedOfferingIds: ['service-1'],
        },
      ],
    })
    expect(starts.map((slot) => slot.start.toISOString())).toEqual([
      '2026-08-20T14:15:00.000Z',
    ])
  })

  it('returns a contiguous sequence and stable professional order', () => {
    const sequence = buildServiceSequence({
      start: iso(14),
      services: [
        { offeringId: 'one', durationMinutes: 30, preparationMinutes: 0, cleanupMinutes: 10, attendeeCount: 1, capacity: 1 },
        { offeringId: 'two', durationMinutes: 45, preparationMinutes: 5, cleanupMinutes: 0, attendeeCount: 1, capacity: 1 },
      ],
      professionals: [
        { membershipId: 'z-member', qualifiedOfferingIds: ['one', 'two'] },
        { membershipId: 'a-member', qualifiedOfferingIds: ['one', 'two'] },
      ],
    })
    expect(sequence.map((segment) => segment.membershipId)).toEqual(['a-member', 'a-member'])
    expect(sequence[1].start.toISOString()).toBe('2026-08-20T14:45:00.000Z')
  })
})
