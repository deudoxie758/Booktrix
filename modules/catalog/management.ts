import { prisma } from '@/lib/prisma'
import { requireBusinessAccess, requireLocationAccess } from '@/modules/organizations/access'

export type OfferingManagementInput = { id?: string; businessId: string; actorId: string; name: string; category: string; description?: string; durationMinutes: number; preparationMinutes: number; cleanupMinutes: number; priceCents: number; capacity: number; confirmationMode: 'AUTOMATIC' | 'MANUAL'; allowFullPayment: boolean; allowDeposit: boolean; allowCash: boolean; depositKind: 'FIXED' | 'PERCENTAGE' | null; depositValue: number | null; locationIds: string[] }
type Dependencies = { authorize(input: OfferingManagementInput): Promise<unknown>; persist(input: OfferingManagementInput): Promise<unknown> }
const invalidOffering = () => Object.assign(new Error('INVALID_OFFERING'), { code: 'INVALID_OFFERING' })

function validate(input: OfferingManagementInput) {
  const invalidDeposit = input.allowDeposit && (!input.depositKind || input.depositValue == null || input.depositValue <= 0 || (input.depositKind === 'PERCENTAGE' && input.depositValue > 100))
  if (!input.name.trim() || !input.category.trim() || input.durationMinutes < 1 || input.preparationMinutes < 0 || input.cleanupMinutes < 0 || input.priceCents < 0 || input.capacity < 1 || !input.locationIds.length || (!input.allowFullPayment && !input.allowDeposit && !input.allowCash) || invalidDeposit) throw invalidOffering()
}

const defaults: Dependencies = {
  authorize: async (input) => { await requireBusinessAccess(input.businessId, ['OWNER', 'MANAGER']); for (const locationId of input.locationIds) await requireLocationAccess(locationId, ['OWNER', 'MANAGER']) },
  persist: (input) => prisma.serviceOffering.upsert({ where: { id: input.id ?? '__new__' }, create: { businessId: input.businessId, name: input.name.trim(), category: input.category.trim(), description: input.description, durationMinutes: input.durationMinutes, preparationMinutes: input.preparationMinutes, cleanupMinutes: input.cleanupMinutes, priceCents: input.priceCents, capacity: input.capacity, confirmationMode: input.confirmationMode, allowFullPayment: input.allowFullPayment, allowDeposit: input.allowDeposit, allowCash: input.allowCash, depositKind: input.depositKind, depositValue: input.depositValue, Locations: { create: input.locationIds.map((locationId) => ({ locationId })) } }, update: { name: input.name.trim(), category: input.category.trim(), description: input.description, durationMinutes: input.durationMinutes, preparationMinutes: input.preparationMinutes, cleanupMinutes: input.cleanupMinutes, priceCents: input.priceCents, capacity: input.capacity, confirmationMode: input.confirmationMode, allowFullPayment: input.allowFullPayment, allowDeposit: input.allowDeposit, allowCash: input.allowCash, depositKind: input.depositKind, depositValue: input.depositValue, Locations: { deleteMany: {}, create: input.locationIds.map((locationId) => ({ locationId })) } } }),
}

export async function saveOffering(input: OfferingManagementInput, dependencies: Dependencies = defaults) { validate(input); await dependencies.authorize(input); return dependencies.persist(input) }

export async function assignQualification(input: { membershipId: string; offeringId: string; locationId: string }) { await requireLocationAccess(input.locationId, ['OWNER', 'MANAGER']); return prisma.staffQualification.upsert({ where: { membershipId_offeringId_locationId: input }, create: input, update: { active: true } }) }
