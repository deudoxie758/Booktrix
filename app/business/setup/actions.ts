'use server'

import { revalidatePath } from 'next/cache'
import { requireActor } from '@/modules/identity/session'
import { completeSetupStep, publishBusiness } from '@/modules/organizations/lifecycle'

export async function updateSetupAction(formData: FormData) {
	const actor = await requireActor()
	const businessId = String(formData.get('businessId'))
	const step = String(formData.get('step'))
	if (!['profileComplete','firstLocationComplete','policiesAccepted','publicationReady'].includes(step)) throw new Error('Invalid setup step')
	await completeSetupStep({ businessId, step: step as 'profileComplete' | 'firstLocationComplete' | 'policiesAccepted' | 'publicationReady', complete: true }, actor)
	revalidatePath('/business/setup')
}

export async function publishBusinessAction(formData: FormData) {
	const actor = await requireActor()
	await publishBusiness(String(formData.get('businessId')), actor)
	revalidatePath('/business')
}
