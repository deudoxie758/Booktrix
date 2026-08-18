import 'dotenv/config'
import { PrismaClient, Role } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()
const password = 'password123'

async function user(id: string, email: string, name: string, role: Role) {
  return prisma.user.upsert({ where: { email }, create: { id, email, name, role, hashedPassword: await hash(password, 10) }, update: { name, role, hashedPassword: await hash(password, 10) } })
}

async function main() {
  const [owner, manager, staff, customer, accounts] = await Promise.all([
    user('booktrix-e2e-owner', 'owner.e2e@booktrix.test', 'E2E Owner', Role.OWNER),
    user('booktrix-e2e-manager', 'manager.e2e@booktrix.test', 'E2E Manager', Role.USER),
    user('booktrix-e2e-staff', 'staff.e2e@booktrix.test', 'Amara E2E', Role.USER),
    user('booktrix-e2e-customer', 'customer.e2e@booktrix.test', 'E2E Customer', Role.USER),
    user('booktrix-e2e-accounts', 'accounts.e2e@booktrix.test', 'E2E Accounts', Role.ACCOUNTANT),
  ])
  const business = await prisma.business.upsert({ where: { slug: 'booktrix-e2e-studio' }, create: { id: 'booktrix-e2e-business', name: 'Booktrix E2E Studio', slug: 'booktrix-e2e-studio', status: 'PUBLISHED' }, update: { name: 'Booktrix E2E Studio', status: 'PUBLISHED' } })
  await prisma.businessSetup.upsert({ where: { businessId: business.id }, create: { businessId: business.id, profileComplete: true, firstLocationComplete: true, policiesAccepted: true, publicationReady: true }, update: { profileComplete: true, firstLocationComplete: true, policiesAccepted: true, publicationReady: true } })
  const castries = await prisma.location.upsert({ where: { businessId_slug: { businessId: business.id, slug: 'castries' } }, create: { id: 'booktrix-e2e-location-castries', businessId: business.id, slug: 'castries', name: 'E2E Castries Studio', address: '1 Test Street, Castries', isActive: true }, update: { name: 'E2E Castries Studio', isActive: true } })
  const rodneyBay = await prisma.location.upsert({ where: { businessId_slug: { businessId: business.id, slug: 'rodney-bay' } }, create: { id: 'booktrix-e2e-location-rodney', businessId: business.id, slug: 'rodney-bay', name: 'E2E Rodney Bay Studio', address: '2 Test Street, Rodney Bay', isActive: true }, update: { name: 'E2E Rodney Bay Studio', isActive: true } })
  const membershipData = [[owner, 'OWNER'], [manager, 'MANAGER'], [staff, 'STAFF'], [accounts, 'ACCOUNTS']] as const
  const memberships = new Map<string, string>()
  for (const [memberUser, role] of membershipData) {
    const membership = await prisma.businessMembership.upsert({ where: { businessId_userId: { businessId: business.id, userId: memberUser.id } }, create: { businessId: business.id, userId: memberUser.id, role }, update: { role, active: true } })
    memberships.set(role, membership.id)
    for (const location of role === 'OWNER' ? [castries, rodneyBay] : [castries]) await prisma.locationAssignment.upsert({ where: { membershipId_locationId: { membershipId: membership.id, locationId: location.id } }, create: { membershipId: membership.id, locationId: location.id }, update: {} })
  }
  const massage = await prisma.serviceOffering.upsert({ where: { id: 'booktrix-e2e-offering-massage' }, create: { id: 'booktrix-e2e-offering-massage', businessId: business.id, category: 'Massage', name: 'E2E Deep Tissue Massage', description: 'Automatic confirmation fixture', durationMinutes: 60, preparationMinutes: 10, cleanupMinutes: 10, priceCents: 12000, confirmationMode: 'AUTOMATIC', allowFullPayment: true, allowCash: true }, update: { active: true } })
  const facial = await prisma.serviceOffering.upsert({ where: { id: 'booktrix-e2e-offering-facial' }, create: { id: 'booktrix-e2e-offering-facial', businessId: business.id, category: 'Skin care', name: 'E2E Classic Facial', description: 'Manual approval fixture', durationMinutes: 45, cleanupMinutes: 10, priceCents: 8500, confirmationMode: 'MANUAL', allowFullPayment: true, allowDeposit: true, allowCash: true, depositKind: 'PERCENTAGE', depositValue: 25 }, update: { active: true } })
  const staffMembershipId = memberships.get('STAFF')!
  for (const offering of [massage, facial]) for (const location of [castries, rodneyBay]) {
    await prisma.serviceLocation.upsert({ where: { offeringId_locationId: { offeringId: offering.id, locationId: location.id } }, create: { offeringId: offering.id, locationId: location.id }, update: { active: true } })
    await prisma.staffQualification.upsert({ where: { membershipId_offeringId_locationId: { membershipId: staffMembershipId, offeringId: offering.id, locationId: location.id } }, create: { membershipId: staffMembershipId, offeringId: offering.id, locationId: location.id }, update: { active: true } })
  }
  for (const location of [castries, rodneyBay]) for (let weekday = 0; weekday < 7; weekday += 1) {
    await prisma.locationHours.upsert({ where: { locationId_weekday_startMinute_endMinute: { locationId: location.id, weekday, startMinute: 540, endMinute: 1020 } }, create: { locationId: location.id, weekday, startMinute: 540, endMinute: 1020 }, update: {} })
    await prisma.staffSchedule.upsert({ where: { membershipId_locationId_weekday_startMinute_endMinute: { membershipId: staffMembershipId, locationId: location.id, weekday, startMinute: 540, endMinute: 1020 } }, create: { membershipId: staffMembershipId, locationId: location.id, weekday, startMinute: 540, endMinute: 1020 }, update: {} })
  }
  await prisma.staffTimeOff.upsert({ where: { id: 'booktrix-e2e-time-off' }, create: { id: 'booktrix-e2e-time-off', membershipId: staffMembershipId, locationId: rodneyBay.id, startsAt: new Date('2030-01-15T13:00:00Z'), endsAt: new Date('2030-01-15T17:00:00Z'), reason: 'E2E fixture' }, update: {} })
  await prisma.bookingHold.upsert({ where: { token: 'booktrix-e2e-expired-hold' }, create: { id: 'booktrix-e2e-expired-hold-id', token: 'booktrix-e2e-expired-hold', idempotencyKey: 'booktrix-e2e-expired-hold', businessId: business.id, customerId: customer.id, checkoutIdentity: 'booktrix-e2e-expired', expiresAt: new Date('2020-01-01T00:00:00Z') }, update: { consumedAt: null, expiresAt: new Date('2020-01-01T00:00:00Z') } })
  console.info('Booktrix Phase 2 E2E fixtures are ready.')
}

main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
