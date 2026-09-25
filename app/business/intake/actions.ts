'use server'

import type { IntakeQuestionType } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import { prisma } from '@/lib/prisma'
import { requireWorkspaceRole } from '@/modules/organizations/context'

const allowedTypes = new Set<IntakeQuestionType>(['SHORT_TEXT', 'LONG_TEXT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'YES_NO', 'DATE', 'CONSENT'])

export async function createIntakeTemplateAction(formData: FormData) {
  const context = await requireWorkspaceRole(['OWNER', 'MANAGER'])
  const name = String(formData.get('name') ?? '').trim()
  const label = String(formData.get('label') ?? '').trim()
  const offeringId = String(formData.get('offeringId') ?? '')
  const type = String(formData.get('type') ?? '') as IntakeQuestionType
  const options = String(formData.get('options') ?? '').split(',').map((item) => item.trim()).filter(Boolean)
  if (name.length < 2 || label.length < 2 || !allowedTypes.has(type)) throw new Error('INVALID_INTAKE_TEMPLATE')
  const offering = await prisma.serviceOffering.findFirst({ where: { id: offeringId, businessId: context.business.id }, select: { id: true } })
  if (!offering) throw new Error('INVALID_INTAKE_TEMPLATE')
  await prisma.intakeTemplate.create({ data: {
    businessId: context.business.id, name,
    Questions: { create: { stableKey: crypto.randomUUID(), label, type, options: options.length ? options : undefined, required: formData.get('required') === 'on', sensitive: formData.get('sensitive') === 'on' } },
    Services: { create: { offeringId } },
  } })
  revalidatePath('/business/intake')
}
