'use server'

import { redirect } from 'next/navigation'
import { requireActor } from '@/modules/identity/session'
import { submitBusinessApplication } from '@/modules/organizations/applications'
import { businessApplicationSchema } from '@/modules/organizations/application-schema'

export async function submitApplicationAction(formData: FormData) {
	const actor = await requireActor()
	const input = businessApplicationSchema.parse({
		businessName: String(formData.get('businessName') ?? ''), ownerName: String(formData.get('ownerName') ?? ''),
		email: String(formData.get('email') ?? ''), phone: String(formData.get('phone') ?? ''),
		address: String(formData.get('address') ?? ''), industry: String(formData.get('industry') ?? ''),
		serviceSummary: String(formData.get('serviceSummary') ?? ''), termsAccepted: formData.get('termsAccepted') === 'on',
	})
	const application = await submitBusinessApplication(input, actor.id)
	redirect(`/for-business/apply/success?id=${application.id}`)
}
