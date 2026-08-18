'use server'

import { revalidatePath } from 'next/cache'
import { reviewBusinessApplication } from '@/modules/organizations/applications'

export async function reviewApplicationAction(formData: FormData) {
	const decision = String(formData.get('decision'))
	if (decision !== 'APPROVED' && decision !== 'REJECTED') throw new Error('Invalid decision')
	await reviewBusinessApplication({ applicationId: String(formData.get('applicationId')), decision, note: String(formData.get('note') ?? '') })
	revalidatePath('/admin/applications')
}
