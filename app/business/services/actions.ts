'use server'
import { revalidatePath } from 'next/cache'
import { saveOffering } from '@/modules/catalog/management'
import { requireWorkspaceRole } from '@/modules/organizations/context'

export async function saveOfferingAction(formData: FormData) {
  const context = await requireWorkspaceRole(['OWNER', 'MANAGER'])
  const depositValue = String(formData.get('depositValue') ?? '')
  await saveOffering({ businessId: context.business.id, actorId: context.actor.id, name: String(formData.get('name') ?? ''), category: String(formData.get('category') ?? ''), durationMinutes: Number(formData.get('durationMinutes')), preparationMinutes: Number(formData.get('preparationMinutes') ?? 0), cleanupMinutes: Number(formData.get('cleanupMinutes') ?? 0), priceCents: Math.round(Number(formData.get('price')) * 100), capacity: Number(formData.get('capacity')), confirmationMode: String(formData.get('confirmationMode')) as 'AUTOMATIC' | 'MANUAL', allowFullPayment: formData.has('allowFullPayment'), allowDeposit: formData.has('allowDeposit'), allowCash: formData.has('allowCash'), depositKind: (String(formData.get('depositKind') ?? '') || null) as 'FIXED' | 'PERCENTAGE' | null, depositValue: depositValue ? Number(depositValue) : null, locationIds: formData.getAll('locationIds').map(String) })
  revalidatePath('/business/services')
}
