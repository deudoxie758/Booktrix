'use server'

import { revalidatePath } from 'next/cache'
import {
  createLocation,
  setLocationActive,
  setLocationHours,
  updateLocation,
  type LocationMutationResult,
} from '@/modules/locations/management'
import { requireWorkspaceRole } from '@/modules/organizations/context'

function locationValues(formData: FormData) {
  return {
    name: String(formData.get('name') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    address: String(formData.get('address') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    email: String(formData.get('email') ?? ''),
  }
}

function refreshLocationConsumers(businessSlug: string) {
  revalidatePath('/business')
  revalidatePath('/business/locations')
  revalidatePath('/business/services')
  revalidatePath('/search')
  revalidatePath('/spas')
  revalidatePath(`/s/${businessSlug}`)
  revalidatePath(`/book/${businessSlug}`)
}

async function mutationContext() {
  return requireWorkspaceRole(['OWNER', 'MANAGER'])
}

function refreshWhenSuccessful(result: LocationMutationResult, businessSlug: string) {
  if (result.ok) refreshLocationConsumers(businessSlug)
  return result
}

export async function createLocationAction(formData: FormData): Promise<LocationMutationResult> {
  const context = await mutationContext()
  const result = await createLocation({ actorId: context.actor.id, businessId: context.business.id, values: locationValues(formData) })
  return refreshWhenSuccessful(result, context.business.slug)
}

export async function updateLocationAction(formData: FormData): Promise<LocationMutationResult> {
  const context = await mutationContext()
  const result = await updateLocation({
    actorId: context.actor.id,
    businessId: context.business.id,
    locationId: String(formData.get('locationId') ?? ''),
    values: locationValues(formData),
  })
  return refreshWhenSuccessful(result, context.business.slug)
}

export async function setLocationHoursAction(formData: FormData): Promise<LocationMutationResult> {
  const context = await mutationContext()
  const hours = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    closed: formData.has(`hours.${weekday}.closed`),
    opensAt: String(formData.get(`hours.${weekday}.opensAt`) ?? ''),
    closesAt: String(formData.get(`hours.${weekday}.closesAt`) ?? ''),
  }))
  const result = await setLocationHours({
    actorId: context.actor.id,
    businessId: context.business.id,
    locationId: String(formData.get('locationId') ?? ''),
    hours,
  })
  return refreshWhenSuccessful(result, context.business.slug)
}

export async function setLocationActiveAction(formData: FormData): Promise<LocationMutationResult> {
  const context = await mutationContext()
  const activeValue = String(formData.get('active') ?? '')
  if (activeValue !== 'true' && activeValue !== 'false') return { ok: false, error: 'Choose a valid location status.', fieldErrors: { active: 'Choose active or inactive.' } }
  const result = await setLocationActive({
    actorId: context.actor.id,
    businessId: context.business.id,
    locationId: String(formData.get('locationId') ?? ''),
    active: activeValue === 'true',
  })
  return refreshWhenSuccessful(result, context.business.slug)
}
