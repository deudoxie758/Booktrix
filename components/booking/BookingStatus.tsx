import { StatusBadge } from '@/components/ui/StatusBadge'

type Segment = { status: string }

function statusDetails(segments: Segment[]) {
  const statuses = new Set(segments.map((segment) => segment.status))
  if (statuses.has('REQUESTED') && statuses.size > 1) return { label: 'Partially awaiting approval', tone: 'warning' as const }
  if (statuses.size === 1 && statuses.has('REQUESTED')) return { label: 'Awaiting approval', tone: 'warning' as const }
  if (statuses.size === 1 && statuses.has('CONFIRMED')) return { label: 'Confirmed', tone: 'success' as const }
  if (statuses.size === 1 && statuses.has('COMPLETED')) return { label: 'Completed', tone: 'neutral' as const }
  if (statuses.size === 1 && statuses.has('CANCELLED')) return { label: 'Cancelled', tone: 'danger' as const }
  if (statuses.has('CANCELLED')) return { label: 'Partially cancelled', tone: 'warning' as const }
  return { label: 'In progress', tone: 'neutral' as const }
}

export function BookingStatus({ segments }: { segments: Segment[] }) {
  const details = statusDetails(segments)
  return <StatusBadge tone={details.tone}>{details.label}</StatusBadge>
}
