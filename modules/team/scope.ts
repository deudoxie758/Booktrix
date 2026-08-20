import type { Prisma } from '@prisma/client'

export type QualificationInput = { offeringId: string; locationId: string }

export type ScopeErrorCodes = { qualificationDenied: string; locationDenied: string }

export type ScopeActor = { role: string; assignedLocationIds: string[] }

export type ScopeTransaction = {
  loadValidScope(input: { businessId: string; locationIds: string[]; qualifications: QualificationInput[] }): Promise<{ locationIds: string[]; qualificationKeys: string[] }>
}

export const teamError = (code: string) => Object.assign(new Error(code), { code })

export function uniqueLocationIds(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

export function uniqueQualifications(values: QualificationInput[], errorCode: string) {
  const qualifications = new Map<string, QualificationInput>()
  for (const value of values) {
    if (!value.offeringId || !value.locationId) throw teamError(errorCode)
    qualifications.set(`${value.offeringId}:${value.locationId}`, value)
  }
  return Array.from(qualifications.values())
}

/**
 * Shared authorization-critical scope validation for team invitations and member access edits.
 * Verifies requested locations/qualifications belong to the active business, that qualifications
 * are only permitted for STAFF and are anchored to a requested location, and that a Manager actor
 * is confined to their own currently assigned locations. Error codes are parameterized so each
 * caller (invitations vs. member management) can keep its own error vocabulary.
 */
export async function validateTeamScope(
  transaction: ScopeTransaction,
  input: { businessId: string; role: string; locationIds: string[]; qualifications: QualificationInput[] },
  actor: ScopeActor,
  errors: ScopeErrorCodes,
) {
  const locationIds = uniqueLocationIds(input.locationIds)
  const qualifications = uniqueQualifications(input.qualifications, errors.qualificationDenied)
  if (input.role !== 'STAFF' && qualifications.length) throw teamError(errors.qualificationDenied)
  if (qualifications.some(({ locationId }) => !locationIds.includes(locationId))) throw teamError(errors.qualificationDenied)
  const valid = await transaction.loadValidScope({ businessId: input.businessId, locationIds, qualifications })
  if (valid.locationIds.length !== locationIds.length || locationIds.some((locationId) => !valid.locationIds.includes(locationId))) throw teamError(errors.locationDenied)
  if (actor.role === 'MANAGER' && locationIds.some((locationId) => !actor.assignedLocationIds.includes(locationId))) throw teamError(errors.locationDenied)
  const validQualificationKeys = new Set(valid.qualificationKeys)
  if (qualifications.some(({ offeringId, locationId }) => !validQualificationKeys.has(`${offeringId}:${locationId}`))) throw teamError(errors.qualificationDenied)
  return { locationIds, qualifications }
}

export function createPrismaScopeLoader(transaction: Prisma.TransactionClient) {
  return async function loadValidScope({ businessId, locationIds, qualifications }: { businessId: string; locationIds: string[]; qualifications: QualificationInput[] }) {
    const [locations, targets] = await Promise.all([
      transaction.location.findMany({ where: { id: { in: locationIds }, businessId, isActive: true }, select: { id: true } }),
      qualifications.length ? transaction.serviceLocation.findMany({ where: { active: true, OR: qualifications.map(({ offeringId, locationId }) => ({ offeringId, locationId })), offering: { businessId, active: true }, location: { businessId, isActive: true } }, select: { offeringId: true, locationId: true } }) : Promise.resolve([]),
    ])
    return { locationIds: locations.map(({ id }) => id), qualificationKeys: targets.map(({ offeringId, locationId }) => `${offeringId}:${locationId}`) }
  }
}
