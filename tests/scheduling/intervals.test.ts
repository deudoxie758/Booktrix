import { describe, expect, it } from 'vitest'

import { intervalsOverlap, mergeIntervals, subtractIntervals } from '@/modules/scheduling/intervals'

const at = (minute: number) => new Date(Date.UTC(2026, 7, 20, 14, minute))

describe('scheduling intervals', () => {
  it('treats touching half-open intervals as non-overlapping', () => {
    expect(intervalsOverlap({ start: at(0), end: at(30) }, { start: at(30), end: at(45) })).toBe(false)
  })

  it('merges overlapping intervals and subtracts occupied time', () => {
    const merged = mergeIntervals([
      { start: at(0), end: at(30) },
      { start: at(15), end: at(45) },
    ])
    expect(subtractIntervals({ start: at(0), end: at(59) }, merged)).toEqual([
      { start: at(45), end: at(59) },
    ])
  })
})
