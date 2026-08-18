import type { TimeInterval } from './types'

export function intervalsOverlap(left: TimeInterval, right: TimeInterval) {
  return left.start < right.end && right.start < left.end
}

export function intervalContains(container: TimeInterval, candidate: TimeInterval) {
  return container.start <= candidate.start && container.end >= candidate.end
}

export function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime())
  const merged: TimeInterval[] = []
  for (const interval of sorted) {
    const previous = merged.at(-1)
    if (!previous || previous.end < interval.start) {
      merged.push({ ...interval })
    } else if (interval.end > previous.end) {
      previous.end = interval.end
    }
  }
  return merged
}

export function subtractIntervals(container: TimeInterval, occupied: TimeInterval[]): TimeInterval[] {
  let available = [{ ...container }]
  for (const blocked of mergeIntervals(occupied)) {
    available = available.flatMap((interval) => {
      if (!intervalsOverlap(interval, blocked)) return [interval]
      const result: TimeInterval[] = []
      if (blocked.start > interval.start) result.push({ start: interval.start, end: blocked.start })
      if (blocked.end < interval.end) result.push({ start: blocked.end, end: interval.end })
      return result
    })
  }
  return available
}
