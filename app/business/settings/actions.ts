'use server'

import { revalidatePath } from 'next/cache'
import { requireWorkspaceRole } from '@/modules/organizations/context'
import {
  saveBusinessPolicy,
  saveBusinessProfile,
  type PolicyMutationResult,
  type ProfileMutationResult,
} from '@/modules/settings/business-policy'
import { setPublicationStatus, type PublicationBlocker } from '@/modules/settings/publication-readiness'

export type PublicationActionResult =
  | { ok: true; status: 'PUBLISHED' | 'SETUP'; blockers: PublicationBlocker[] }
  | { ok: false; error: string; blockers?: PublicationBlocker[] }

const messages: Record<string, string> = {
  SETTINGS_ACCESS_DENIED: 'You are not authorized to manage business settings.',
  PUBLICATION_NOT_READY: 'This business is not ready to publish yet. Resolve the readiness items below.',
  PUBLICATION_STATUS_LOCKED: 'This business’s marketplace status is managed by Booktrix review, not from Settings.',
}

function refreshSettingsConsumers(businessSlug: string) {
  for (const path of ['/business/settings', '/business', '/search', '/spas']) revalidatePath(path)
  revalidatePath(`/s/${businessSlug}`)
}

async function settingsContext() {
  return requireWorkspaceRole(['OWNER'])
}

export async function saveBusinessProfileAction(formData: FormData): Promise<ProfileMutationResult> {
  const context = await settingsContext()
  const result = await saveBusinessProfile({
    actorId: context.actor.id,
    businessId: context.business.id,
    values: {
      name: String(formData.get('name') ?? ''),
      slug: String(formData.get('slug') ?? ''),
      description: String(formData.get('description') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      email: String(formData.get('email') ?? ''),
    },
  })
  if (result.ok) refreshSettingsConsumers(result.profile.slug)
  return result
}

export async function saveBusinessPolicyAction(formData: FormData): Promise<PolicyMutationResult> {
  const context = await settingsContext()
  const result = await saveBusinessPolicy({
    actorId: context.actor.id,
    businessId: context.business.id,
    values: {
      currency: String(formData.get('currency') ?? ''),
      timezone: String(formData.get('timezone') ?? ''),
      defaultConfirmationMode: String(formData.get('defaultConfirmationMode') ?? '') as 'AUTOMATIC' | 'MANUAL',
      minimumNoticeMinutes: Number(formData.get('minimumNoticeMinutes')),
      maximumAdvanceBookingDays: Number(formData.get('maximumAdvanceBookingDays')),
      defaultPreparationMinutes: Number(formData.get('defaultPreparationMinutes')),
      defaultCleanupMinutes: Number(formData.get('defaultCleanupMinutes')),
      cancellationNoticeHours: Number(formData.get('cancellationNoticeHours')),
      reschedulingNoticeHours: Number(formData.get('reschedulingNoticeHours')),
      cancellationPolicyText: String(formData.get('cancellationPolicyText') ?? ''),
    },
  })
  if (result.ok) refreshSettingsConsumers(context.business.slug)
  return result
}

export async function setPublicationStatusAction(formData: FormData): Promise<PublicationActionResult> {
  const context = await settingsContext()
  const publish = String(formData.get('publish') ?? '') === 'true'
  try {
    const result = await setPublicationStatus({ actorId: context.actor.id, businessId: context.business.id, publish })
    refreshSettingsConsumers(context.business.slug)
    return { ok: true, status: result.status, blockers: result.blockers }
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String((error as { code: unknown }).code) : ''
    const blockers = error && typeof error === 'object' && 'blockers' in error ? (error as { blockers: PublicationBlocker[] }).blockers : undefined
    return { ok: false, error: messages[code] ?? 'Unable to update the publication status. Please try again.', blockers }
  }
}
