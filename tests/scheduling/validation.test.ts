import { describe, expect, it } from 'vitest'

import { deriveValidatedSegments, recurringIntervalsForRange, type SchedulingSnapshot } from '@/modules/scheduling/validation'

const snapshot: SchedulingSnapshot = {
  businessId: 'business-1',
  businessPublished: true,
  location: {
    id: 'location-1',
    businessId: 'business-1',
    active: true,
    timezone: 'America/St_Lucia',
    hours: [{ weekday: 4, startMinute: 9 * 60, endMinute: 17 * 60 }],
  },
  offerings: [{
    id: 'service-1', businessId: 'business-1', active: true,
    durationMinutes: 60, preparationMinutes: 15, cleanupMinutes: 15,
    capacity: 2, priceCents: 12000,
  }],
  professionals: [{
    membershipId: 'member-1', businessId: 'business-1', active: true,
    assignedLocationIds: ['location-1'], qualifiedOfferingIds: ['service-1'],
    schedules: [{ weekday: 4, startMinute: 9 * 60, endMinute: 17 * 60 }],
    timeOff: [],
  }],
  occupied: [],
}

describe('scheduling validation', () => {
  it('derives price, duration, buffers, and capacity from the scheduling snapshot', () => {
    const [segment] = deriveValidatedSegments({
      businessId: 'business-1',
      locationId: 'location-1',
      segments: [{ offeringId: 'service-1', membershipId: 'member-1', start: new Date('2026-08-20T14:00:00.000Z'), attendeeCount: 2 }],
    }, snapshot)

    expect(segment).toEqual({
      offeringId: 'service-1', locationId: 'location-1', membershipId: 'member-1',
      start: new Date('2026-08-20T14:00:00.000Z'),
      end: new Date('2026-08-20T15:00:00.000Z'),
      occupiedStart: new Date('2026-08-20T13:45:00.000Z'),
      occupiedEnd: new Date('2026-08-20T15:15:00.000Z'),
      attendeeCount: 2, capacity: 2, priceCents: 24000,
    })
  })

  it.each([
    ['closed weekday', { location: { ...snapshot.location, hours: [{ weekday: 5, startMinute: 9 * 60, endMinute: 17 * 60 }] } }],
    ['inactive membership', { professionals: [{ ...snapshot.professionals[0]!, active: false }] }],
    ['unassigned membership', { professionals: [{ ...snapshot.professionals[0]!, assignedLocationIds: [] }] }],
    ['time off', { professionals: [{ ...snapshot.professionals[0]!, timeOff: [{ start: new Date('2026-08-20T14:30:00.000Z'), end: new Date('2026-08-20T15:30:00.000Z') }] }] }],
    ['existing occupancy', { occupied: [{ membershipId: 'member-1', start: new Date('2026-08-20T14:30:00.000Z'), end: new Date('2026-08-20T15:30:00.000Z'), attendeeCount: 1 }] }],
  ])('rejects %s', (_name, changes) => {
    expect(() => deriveValidatedSegments({
      businessId: 'business-1', locationId: 'location-1',
      segments: [{ offeringId: 'service-1', membershipId: 'member-1', start: new Date('2026-08-20T14:00:00.000Z'), attendeeCount: 2 }],
    }, { ...snapshot, ...changes } as SchedulingSnapshot)).toThrow('SLOT_UNAVAILABLE')
  })

  it('rejects a non-contiguous multi-service sequence', () => {
    const multi: SchedulingSnapshot = {
      ...snapshot,
      offerings: [...snapshot.offerings, { ...snapshot.offerings[0]!, id: 'service-2', durationMinutes: 30, preparationMinutes: 5, cleanupMinutes: 10 }],
      professionals: [{ ...snapshot.professionals[0]!, qualifiedOfferingIds: ['service-1', 'service-2'] }],
    }
    expect(() => deriveValidatedSegments({
      businessId: 'business-1', locationId: 'location-1',
      segments: [
        { offeringId: 'service-1', membershipId: 'member-1', start: new Date('2026-08-20T14:00:00.000Z'), attendeeCount: 1 },
        { offeringId: 'service-2', membershipId: 'member-1', start: new Date('2026-08-20T16:00:00.000Z'), attendeeCount: 1 },
      ],
    }, multi)).toThrow('INVALID_SEQUENCE')
  })

  it('rejects any overlapping appointment for the professional even when attendee capacity remains', () => {
    expect(() => deriveValidatedSegments({
      businessId: 'business-1', locationId: 'location-1',
      segments: [{ offeringId: 'service-1', membershipId: 'member-1', start: new Date('2026-08-20T14:00:00.000Z'), attendeeCount: 1 }],
    }, {
      ...snapshot,
      offerings: [{ ...snapshot.offerings[0]!, capacity: 10 }],
      occupied: [{ membershipId: 'member-1', start: new Date('2026-08-20T14:30:00.000Z'), end: new Date('2026-08-20T15:30:00.000Z'), attendeeCount: 1 }],
    })).toThrow('SLOT_UNAVAILABLE')
  })

  it('expands recurring weekday hours in America/St_Lucia across a date range', () => {
    const intervals = recurringIntervalsForRange(
      [{ weekday: 4, startMinute: 9 * 60, endMinute: 17 * 60 }],
      new Date('2026-08-19T04:00:00.000Z'),
      new Date('2026-08-22T04:00:00.000Z'),
      'America/St_Lucia',
    )
    expect(intervals).toEqual([{ start: new Date('2026-08-20T13:00:00.000Z'), end: new Date('2026-08-20T21:00:00.000Z') }])
  })
})
