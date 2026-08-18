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

type OverrideClient = Pick<Prisma.TransactionClient, 'bookingOverride' | 'auditLog'>

export async function persistSchedulingOverride(
  client: OverrideClient,
  data: SchedulingOverrideInput,
  auditContext: Record<string, string> = {},
) {
  const override = await client.bookingOverride.create({ data })
  await client.auditLog.create({
    data: {
      actorId: data.actorUserId,
      action: 'BOOKING_SCHEDULE_OVERRIDE',
      details: { ...auditContext, segmentId: data.segmentId, reason: data.reason, previousValues: data.previousValues, resultingValues: data.resultingValues },
    },
  })
  return override
}

const defaultWriter: OverrideWriter = {
  create: ({ data }) => prisma.$transaction((tx) => persistSchedulingOverride(tx, data)),
}

export async function recordSchedulingOverride(
  input: SchedulingOverrideInput,
  writer: OverrideWriter = defaultWriter,
) {
  const reason = input.reason.trim()
  if (!reason) throw new Error('OVERRIDE_REASON_REQUIRED')
  return writer.create({ data: { ...input, reason } })
}
