import { describe, expect, it } from 'vitest'
import { parseLocationValues } from '@/modules/locations/schema'

const valid = {
  name: 'Rodney Bay Studio',
  slug: 'rodney-bay',
  address: 'Baywalk Mall, Rodney Bay',
}

describe('location coordinates', () => {
  it('accepts a complete coordinate pair', () => {
    expect(parseLocationValues({ ...valid, latitude: 14.0101, longitude: -60.9875 })).toMatchObject({
      ok: true,
      data: { latitude: 14.0101, longitude: -60.9875, coordinateSource: 'MANUAL' },
    })
  })

  it.each([
    [{ latitude: 14.0101, longitude: null }, 'longitude'],
    [{ latitude: null, longitude: -60.9875 }, 'latitude'],
    [{ latitude: 91, longitude: -60.9875 }, 'latitude'],
    [{ latitude: 14.0101, longitude: -181 }, 'longitude'],
  ])('rejects partial and out-of-range coordinates', (coordinates, field) => {
    expect(parseLocationValues({ ...valid, ...coordinates })).toMatchObject({ ok: false, fieldErrors: { [field]: expect.any(String) } })
  })

  it('normalizes two blank coordinate fields to null', () => {
    expect(parseLocationValues({ ...valid, latitude: null, longitude: null })).toMatchObject({
      ok: true,
      data: { latitude: null, longitude: null, coordinateSource: null },
    })
  })
})
