import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

export type SchedulingOverrideInput = {
  segmentId: string
  actorUserId: string
  reason: string
  previousValues: Prisma.InputJsonValue
  resultingValues: Prisma.InputJsonValue
}

type OverrideWriter = {
  create(args: { data: SchedulingOverrideInput }): Promise<unknown>
}

const defaultWriter: OverrideWriter = {
  create: ({ data }) => prisma.$transaction(async (tx) => {
    const override = await tx.bookingOverride.create({ data })
    await tx.auditLog.create({ data: { actorId: data.actorUserId, action: 'BOOKING_SCHEDULE_OVERRIDE', details: { segmentId: data.segmentId, reason: data.reason, previousValues: data.previousValues, resultingValues: data.resultingValues } } })
    return override
  }),
}

export async function recordSchedulingOverride(
  input: SchedulingOverrideInput,
  writer: OverrideWriter = defaultWriter,
) {
  const reason = input.reason.trim()
  if (!reason) throw new Error('OVERRIDE_REASON_REQUIRED')
  return writer.create({ data: { ...input, reason } })
}
