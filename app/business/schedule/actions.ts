'use server'
import { revalidatePath } from 'next/cache'
import { saveStaffSchedule, saveTimeOff } from '@/modules/scheduling/management'
import { requireWorkspaceRole } from '@/modules/organizations/context'
export async function saveStaffScheduleAction(formData: FormData) { const context = await requireWorkspaceRole(['OWNER', 'MANAGER']); await saveStaffSchedule({ businessId: context.business.id, locationId: String(formData.get('locationId')), membershipId: String(formData.get('membershipId')), weekday: Number(formData.get('weekday')), intervals: [[String(formData.get('startTime')), String(formData.get('endTime'))]] }); revalidatePath('/business/schedule') }
export async function saveTimeOffAction(formData: FormData) { await requireWorkspaceRole(['OWNER', 'MANAGER']); await saveTimeOff({ locationId: String(formData.get('locationId')), membershipId: String(formData.get('membershipId')), startsAt: new Date(String(formData.get('startsAt'))), endsAt: new Date(String(formData.get('endsAt'))), reason: String(formData.get('reason') ?? '') || undefined }); revalidatePath('/business/schedule') }
