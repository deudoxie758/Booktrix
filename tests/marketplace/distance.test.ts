import { describe, expect, it } from 'vitest'
import { distanceKm, parseSearchCoordinates } from '@/modules/marketplace/distance'

describe('marketplace distance', () => {
  it('parses only complete finite in-range coordinates', () => {
    expect(parseSearchCoordinates({ latitude: '14.0101', longitude: '-60.9875' })).toEqual({ latitude: 14.0101, longitude: -60.9875 })
    expect(parseSearchCoordinates({ latitude: 'NaN', longitude: '-60.9' })).toBeNull()
    expect(parseSearchCoordinates({ latitude: '91', longitude: '-60.9' })).toBeNull()
    expect(parseSearchCoordinates({ latitude: '14' })).toBeNull()
  })

  it('calculates hand-checked Haversine distances in kilometres', () => {
    expect(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 })).toBe(0)
    expect(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 })).toBeCloseTo(111.195, 3)
  })
})
