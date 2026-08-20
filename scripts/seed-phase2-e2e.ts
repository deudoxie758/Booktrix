import 'dotenv/config'
import { createHash } from 'node:crypto'
import { BusinessRole, ConfirmationMode, DepositKind, PrismaClient, Role } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()
const password = 'password123'
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

// Pure, testable date helpers so the fixture test can assert every
// security/finance state is expressed relative to "now" (Saint Lucia local
// time), not a hardcoded calendar date that would eventually drift into the
// past or fail once the fixture is years old.
export function pendingInvitationWindow(now: Date) {
  return { expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) }
}
export function expiredInvitationWindow(now: Date) {
  return { expiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
}
// Saint Lucia (America/St_Lucia) is fixed at UTC-4 year-round (no DST), so a
// local hour converts to UTC with a constant +4 offset.
export function stLuciaFutureAppointment(now: Date, daysAhead: number, localHour = 10) {
  const base = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)
  const startsAt = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), localHour + 4, 0, 0))
  const endsAt = new Date(startsAt.getTime() + 60 * 60000)
  return { startsAt, endsAt }
}

// Deterministic, namespaced fixtures for Task 6's cross-role security and
// responsive E2E coverage. Every id below is stable across reruns (upserted
// by id, never destructively recreated) and every user-facing token is fixed
// so specs can reuse it. All ids are `booktrix-e2e-*` namespaced.
export const workspaceSecurityFixtures = {
  business: { id: 'booktrix-e2e-business', slug: 'booktrix-e2e-studio' },
  inactiveLocationId: 'booktrix-e2e-location-retired',
  invitations: {
    pending: { id: 'booktrix-e2e-invitation-pending', email: 'pending-invite.e2e@booktrix.test', token: 'booktrix-e2e-invitation-token-pending-0001' },
    expired: { id: 'booktrix-e2e-invitation-expired', email: 'expired-invite.e2e@booktrix.test', token: 'booktrix-e2e-invitation-token-expired-0001' },
    revoked: { id: 'booktrix-e2e-invitation-revoked', email: 'revoked-invite.e2e@booktrix.test', token: 'booktrix-e2e-invitation-token-revoked-0001' },
  },
  cashOrders: {
    dueCastries: { id: 'booktrix-e2e-order-cash-due-castries', cashDueCents: 12000, cashCollectedCents: 0 },
    partialCastries: { id: 'booktrix-e2e-order-cash-partial-castries', cashDueCents: 12000, cashCollectedCents: 5000 },
    dueRodneyBay: { id: 'booktrix-e2e-order-cash-due-rodney', cashDueCents: 12000, cashCollectedCents: 0 },
  },
  // A Staff member scoped only to Castries (unlike `staff.e2e@booktrix.test`,
  // which is assigned to both studio locations and is therefore entirely out
  // of the Manager's single-location view). This gives the Manager an
  // in-scope team member to attempt a forged role-elevation mutation against.
  staffCastriesOnly: { userId: 'booktrix-e2e-staff-castries', membershipId: 'booktrix-e2e-membership-staff-castries', email: 'staff-castries.e2e@booktrix.test', name: 'Priya E2E' },
  // Reuses an existing, wholly separate demo business/location/membership
  // (seeded below) as the adversarial "foreign" target for forged cross-
  // tenant mutation attempts — no dedicated fixture needed since six
  // independent demo storefronts already exist.
  crossTenant: {
    foreignBusinessId: 'booktrix-e2e-business-sole-wellness-house',
    foreignLocationId: 'booktrix-e2e-location-sole-castries',
    foreignMembershipId: 'booktrix-e2e-member-sole-owner',
    foreignOwnerEmail: 'sole-owner@booktrix.test',
  },
}
type Hours = Array<[number, number, number]>
type LocationFixture = { id: string; slug: string; name: string; address: string; phone: string; email: string; hours: Hours }
type MemberFixture = { id: string; email: string; name: string; role: BusinessRole; locations: string[] }
type OfferingFixture = { id: string; category: string; name: string; description: string; minutes: number; price: number; locations: string[]; staff: string[]; mode?: ConfirmationMode; deposit?: [DepositKind, number]; cash?: boolean; full?: boolean }
type BusinessFixture = { id: string; name: string; slug: string; coverImageUrl: string; locations: LocationFixture[]; members: MemberFixture[]; offerings: OfferingFixture[] }

const standardHours: Hours = [[1, 540, 1020], [2, 540, 1020], [3, 540, 1020], [4, 540, 1020], [5, 540, 1080], [6, 600, 960]]
const clubHours: Hours = [[1, 480, 1140], [2, 480, 1140], [3, 480, 1140], [4, 480, 1140], [5, 480, 1140], [6, 540, 1020], [0, 540, 900]]
const location = (id: string, slug: string, name: string, address: string, hours = standardHours): LocationFixture => ({ id, slug, name, address, phone: '+1 758-555-0100', email: `${slug}@booktrix.test`, hours })
const member = (id: string, name: string, role: BusinessRole, locations: string[]): MemberFixture => ({ id, name, role, locations, email: `${id.replace('booktrix-e2e-member-', '')}@booktrix.test` })
const offering = (id: string, category: string, name: string, minutes: number, price: number, locations: string[], staff: string[], description: string, mode: ConfirmationMode = 'AUTOMATIC', deposit?: [DepositKind, number], cash = true, full = true): OfferingFixture => ({ id, category, name, minutes, price, locations, staff, description, mode, deposit, cash, full })

export const demoBusinesses: BusinessFixture[] = [
  {
    id: 'booktrix-e2e-business-sole-wellness-house', name: 'Solé Wellness House', slug: 'sole-wellness-house', coverImageUrl: '/images/demo-storefronts/sole-wellness-house.png',
    locations: [location('booktrix-e2e-location-sole-castries', 'castries', 'Solé Wellness House — Castries', '12 Choc Bay, Castries, Saint Lucia'), location('booktrix-e2e-location-sole-rodney-bay', 'rodney-bay', 'Solé Wellness House — Rodney Bay', 'Baywalk Mall, Rodney Bay, Saint Lucia')],
    members: [member('booktrix-e2e-member-sole-owner', 'Alana Joseph', 'OWNER', ['castries', 'rodney-bay']), member('booktrix-e2e-member-sole-manager', 'Kira Charles', 'MANAGER', ['castries', 'rodney-bay']), member('booktrix-e2e-member-sole-nadia', 'Nadia Pierre', 'STAFF', ['castries', 'rodney-bay']), member('booktrix-e2e-member-sole-levi', 'Levi Henry', 'STAFF', ['rodney-bay'])],
    offerings: [offering('booktrix-e2e-offering-sole-deep-tissue', 'Massage', 'Caribbean Deep Tissue Massage', 75, 18500, ['castries', 'rodney-bay'], ['booktrix-e2e-member-sole-nadia', 'booktrix-e2e-member-sole-levi'], 'Targeted therapeutic massage with locally blended coconut and bay leaf oil.'), offering('booktrix-e2e-offering-sole-cocoa-facial', 'Skin care', 'Cocoa Renewal Facial', 60, 14500, ['castries', 'rodney-bay'], ['booktrix-e2e-member-sole-nadia'], 'Hydrating facial featuring Saint Lucian cocoa and botanical extracts.', 'MANUAL', ['PERCENTAGE', 30]), offering('booktrix-e2e-offering-sole-couples', 'Wellness', 'Sunset Couples Ritual', 90, 42000, ['rodney-bay'], ['booktrix-e2e-member-sole-nadia', 'booktrix-e2e-member-sole-levi'], 'Side-by-side massage ritual for two in the Rodney Bay suite.', 'MANUAL', ['FIXED', 10000], false)],
  },
  {
    id: 'booktrix-e2e-business-muse-nail-atelier', name: 'Muse Nail Atelier', slug: 'muse-nail-atelier', coverImageUrl: '/images/demo-storefronts/muse-nail-atelier.png',
    locations: [location('booktrix-e2e-location-muse-gros-islet', 'gros-islet', 'Muse Nail Atelier — Gros Islet', '18 Dauphin Street, Gros Islet, Saint Lucia')],
    members: [member('booktrix-e2e-member-muse-owner', 'Maya Ferdinand', 'OWNER', ['gros-islet']), member('booktrix-e2e-member-muse-shanice', 'Shanice Louis', 'STAFF', ['gros-islet']), member('booktrix-e2e-member-muse-cherise', 'Cherise James', 'STAFF', ['gros-islet'])],
    offerings: [offering('booktrix-e2e-offering-muse-structured-manicure', 'Nails & beauty', 'Structured Gel Manicure', 75, 11000, ['gros-islet'], ['booktrix-e2e-member-muse-shanice', 'booktrix-e2e-member-muse-cherise'], 'Detailed dry manicure with builder gel and a long-wearing gel finish.'), offering('booktrix-e2e-offering-muse-lash-set', 'Lashes', 'Soft Volume Lash Set', 120, 18000, ['gros-islet'], ['booktrix-e2e-member-muse-cherise'], 'Customized lightweight volume set for a soft island-glam finish.', 'MANUAL', ['FIXED', 6000]), offering('booktrix-e2e-offering-muse-nail-art', 'Nails & beauty', 'Signature Nail Art Add-On', 30, 4500, ['gros-islet'], ['booktrix-e2e-member-muse-shanice'], 'Hand-painted details, chrome, or seasonal accents for an existing service.')],
  },
  {
    id: 'booktrix-e2e-business-crown-and-coil-studio', name: 'Crown & Coil Studio', slug: 'crown-and-coil-studio', coverImageUrl: '/images/demo-storefronts/crown-and-coil-studio.png',
    locations: [location('booktrix-e2e-location-crown-castries', 'castries', 'Crown & Coil Studio — Castries', '44 Brazil Street, Castries, Saint Lucia'), location('booktrix-e2e-location-crown-vieux-fort', 'vieux-fort', 'Crown & Coil Studio — Vieux Fort', '21 Commercial Street, Vieux Fort, Saint Lucia')],
    members: [member('booktrix-e2e-member-crown-owner', 'Jalen St. Prix', 'OWNER', ['castries', 'vieux-fort']), member('booktrix-e2e-member-crown-asha', 'Asha Felix', 'STAFF', ['castries', 'vieux-fort']), member('booktrix-e2e-member-crown-kyle', 'Kyle Augustin', 'STAFF', ['castries']), member('booktrix-e2e-member-crown-marcus', 'Marcus Belrose', 'STAFF', ['vieux-fort'])],
    offerings: [offering('booktrix-e2e-offering-crown-silk-press', 'Hair & grooming', 'Silk Press & Trim', 120, 16500, ['castries', 'vieux-fort'], ['booktrix-e2e-member-crown-asha'], 'Heat-protected cleansing, silk press, and healthy-end trim.', 'MANUAL', ['FIXED', 5000]), offering('booktrix-e2e-offering-crown-loc-retwist', 'Hair & grooming', 'Loc Retwist & Style', 105, 14500, ['castries', 'vieux-fort'], ['booktrix-e2e-member-crown-asha', 'booktrix-e2e-member-crown-marcus'], 'Cleanse, retwist, and protective everyday styling.', 'AUTOMATIC', ['PERCENTAGE', 25]), offering('booktrix-e2e-offering-crown-fade', 'Hair & grooming', 'Precision Fade & Beard Line-Up', 60, 9000, ['castries'], ['booktrix-e2e-member-crown-kyle'], 'Modern fade, detailed beard shaping, and hot-towel finish.')],
  },
  {
    id: 'booktrix-e2e-business-harbour-bodyworks', name: 'Harbour Bodyworks', slug: 'harbour-bodyworks', coverImageUrl: '/images/demo-storefronts/harbour-bodyworks.png',
    locations: [location('booktrix-e2e-location-harbour-marigot-bay', 'marigot-bay', 'Harbour Bodyworks — Marigot Bay', 'Marigot Bay Marina, Castries, Saint Lucia'), location('booktrix-e2e-location-harbour-soufriere', 'soufriere', 'Harbour Bodyworks — Soufrière', '9 Bridge Street, Soufrière, Saint Lucia')],
    members: [member('booktrix-e2e-member-harbour-owner', 'Dr. Simone Samuel', 'OWNER', ['marigot-bay', 'soufriere']), member('booktrix-e2e-member-harbour-elijah', 'Elijah Francis', 'STAFF', ['marigot-bay', 'soufriere']), member('booktrix-e2e-member-harbour-renee', 'Renée Modeste', 'STAFF', ['soufriere'])],
    offerings: [offering('booktrix-e2e-offering-harbour-assessment', 'Physiotherapy', 'Physiotherapy Initial Assessment', 60, 22000, ['marigot-bay', 'soufriere'], ['booktrix-e2e-member-harbour-elijah'], 'Movement, pain, and recovery assessment with a practical treatment plan.', 'MANUAL', ['FIXED', 7500], false), offering('booktrix-e2e-offering-harbour-sports-recovery', 'Bodywork', 'Sports Recovery Bodywork', 75, 17500, ['marigot-bay', 'soufriere'], ['booktrix-e2e-member-harbour-elijah', 'booktrix-e2e-member-harbour-renee'], 'Assisted stretching and soft tissue bodywork for recovery.'), offering('booktrix-e2e-offering-harbour-postnatal', 'Physiotherapy', 'Postnatal Core Restore', 60, 19000, ['soufriere'], ['booktrix-e2e-member-harbour-renee'], 'Private pelvic and core recovery session.', 'MANUAL', ['PERCENTAGE', 25])],
  },
  {
    id: 'booktrix-e2e-business-piton-movement-club', name: 'Piton Movement Club', slug: 'piton-movement-club', coverImageUrl: '/images/demo-storefronts/piton-movement-club.png',
    locations: [location('booktrix-e2e-location-piton-rodney-bay', 'rodney-bay', 'Piton Movement Club — Rodney Bay', 'Reduit Beach Avenue, Rodney Bay, Saint Lucia', clubHours), location('booktrix-e2e-location-piton-micoud', 'micoud', 'Piton Movement Club — Micoud', 'Morne Micoud, Micoud, Saint Lucia', clubHours)],
    members: [member('booktrix-e2e-member-piton-owner', 'Tariq Bousquet', 'OWNER', ['rodney-bay', 'micoud']), member('booktrix-e2e-member-piton-kiara', 'Kiara George', 'STAFF', ['rodney-bay', 'micoud']), member('booktrix-e2e-member-piton-david', 'David Joseph', 'STAFF', ['rodney-bay'])],
    offerings: [offering('booktrix-e2e-offering-piton-reformer', 'Fitness & wellness', 'Private Reformer Pilates', 55, 16000, ['rodney-bay', 'micoud'], ['booktrix-e2e-member-piton-kiara'], 'One-to-one reformer session with mobility and strength programming.'), offering('booktrix-e2e-offering-piton-strength', 'Fitness & wellness', 'Personal Strength Session', 60, 14000, ['rodney-bay', 'micoud'], ['booktrix-e2e-member-piton-kiara', 'booktrix-e2e-member-piton-david'], 'Progressive strength coaching with a movement-screen-informed plan.', 'AUTOMATIC', ['PERCENTAGE', 20]), offering('booktrix-e2e-offering-piton-breathwork', 'Wellness', 'Guided Breathwork Reset', 45, 8500, ['rodney-bay'], ['booktrix-e2e-member-piton-kiara'], 'Private guided breathwork to downshift stress and restore focus.', 'MANUAL')],
  },
  {
    id: 'booktrix-e2e-business-island-glow-beauty-bar', name: 'Island Glow Beauty Bar', slug: 'island-glow-beauty-bar', coverImageUrl: '/images/demo-storefronts/island-glow-beauty-bar.png',
    locations: [location('booktrix-e2e-location-glow-laborie', 'laborie', 'Island Glow Beauty Bar — Laborie', '3 Lighthouse Road, Laborie, Saint Lucia')],
    members: [member('booktrix-e2e-member-glow-owner', 'Imani Laurent', 'OWNER', ['laborie']), member('booktrix-e2e-member-glow-zaria', 'Zaria Noel', 'STAFF', ['laborie']), member('booktrix-e2e-member-glow-amber', 'Amber Cox', 'STAFF', ['laborie'])],
    offerings: [offering('booktrix-e2e-offering-glow-brow', 'Beauty', 'Brow Shape & Hybrid Tint', 45, 7500, ['laborie'], ['booktrix-e2e-member-glow-zaria'], 'Brow mapping, shaping, and a soft hybrid tint.', 'AUTOMATIC', undefined, true, false), offering('booktrix-e2e-offering-glow-makeup', 'Beauty', 'Occasion Makeup Application', 75, 15500, ['laborie'], ['booktrix-e2e-member-glow-amber'], 'Long-wear complexion and eye makeup for weddings and events.', 'MANUAL', ['FIXED', 5000]), offering('booktrix-e2e-offering-glow-waxing', 'Beauty', 'Brazilian Wax', 45, 10500, ['laborie'], ['booktrix-e2e-member-glow-zaria'], 'Private professional waxing appointment with calming aftercare.', 'MANUAL', ['PERCENTAGE', 30])],
  },
]

type FixtureOwnership = {
  users: Array<{ id: string; email: string }>
  businesses: Array<{ id: string; slug: string }>
  offerings: Array<{ id: string; allowFullPayment: boolean; allowDeposit: boolean; allowCash: boolean }>
}

export const fixtureOwnership: FixtureOwnership = {
  users: [
    ...demoBusinesses.flatMap((business) => business.members.map((member) => ({ id: `booktrix-e2e-user-${member.id.slice('booktrix-e2e-member-'.length)}`, email: member.email }))),
    { id: 'booktrix-e2e-owner', email: 'owner.e2e@booktrix.test' }, { id: 'booktrix-e2e-manager', email: 'manager.e2e@booktrix.test' }, { id: 'booktrix-e2e-staff', email: 'staff.e2e@booktrix.test' }, { id: 'booktrix-e2e-customer', email: 'customer.e2e@booktrix.test' }, { id: 'booktrix-e2e-accounts', email: 'accounts.e2e@booktrix.test' },
    { id: workspaceSecurityFixtures.staffCastriesOnly.userId, email: workspaceSecurityFixtures.staffCastriesOnly.email },
  ],
  businesses: [...demoBusinesses.map(({ id, slug }) => ({ id, slug })), { id: 'booktrix-e2e-business', slug: 'booktrix-e2e-studio' }],
  offerings: demoBusinesses.flatMap((business) => business.offerings.map((offering) => ({ id: offering.id, allowFullPayment: offering.full ?? true, allowDeposit: Boolean(offering.deposit), allowCash: offering.cash ?? true }))),
}

export function assertFixtureOwnership(expected: FixtureOwnership, existing: Pick<FixtureOwnership, 'users' | 'businesses'>) {
  for (const expectedUser of expected.users) for (const user of existing.users.filter((candidate) => candidate.id === expectedUser.id || candidate.email === expectedUser.email)) {
    if (user.id !== expectedUser.id || user.email !== expectedUser.email) throw new Error(`Fixture ownership collision for user ${expectedUser.email}`)
  }
  for (const expectedBusiness of expected.businesses) for (const business of existing.businesses.filter((candidate) => candidate.id === expectedBusiness.id || candidate.slug === expectedBusiness.slug)) {
    if (business.id !== expectedBusiness.id || business.slug !== expectedBusiness.slug) throw new Error(`Fixture ownership collision for business ${expectedBusiness.slug}`)
  }
}

async function preflightFixtureOwnership() {
  const [users, businesses] = await Promise.all([
    prisma.user.findMany({ where: { OR: [{ id: { in: fixtureOwnership.users.map((user) => user.id) } }, { email: { in: fixtureOwnership.users.map((user) => user.email) } }] }, select: { id: true, email: true } }),
    prisma.business.findMany({ where: { OR: [{ id: { in: fixtureOwnership.businesses.map((business) => business.id) } }, { slug: { in: fixtureOwnership.businesses.map((business) => business.slug) } }] }, select: { id: true, slug: true } }),
  ])
  assertFixtureOwnership(fixtureOwnership, { users, businesses })
}

async function upsertUser(id: string, email: string, name: string, role: Role) {
  const hashedPassword = await hash(password, 10)
  return prisma.user.upsert({ where: { email }, create: { id, email, name, role, hashedPassword }, update: { name, role, hashedPassword } })
}

async function seedDemoBusiness(fixture: BusinessFixture) {
  const business = await prisma.business.upsert({ where: { slug: fixture.slug }, create: { id: fixture.id, name: fixture.name, slug: fixture.slug, coverImageUrl: fixture.coverImageUrl, status: 'PUBLISHED' }, update: { name: fixture.name, coverImageUrl: fixture.coverImageUrl, status: 'PUBLISHED' } })
  await prisma.businessSetup.upsert({ where: { businessId: business.id }, create: { businessId: business.id, profileComplete: true, firstLocationComplete: true, policiesAccepted: true, publicationReady: true }, update: { profileComplete: true, firstLocationComplete: true, policiesAccepted: true, publicationReady: true } })
  const locations = new Map<string, { id: string }>()
  for (const item of fixture.locations) {
    const { hours, ...locationData } = item
    const saved = await prisma.location.upsert({ where: { businessId_slug: { businessId: business.id, slug: item.slug } }, create: { ...locationData, businessId: business.id, isActive: true }, update: { name: item.name, address: item.address, phone: item.phone, email: item.email, isActive: true } })
    locations.set(item.slug, saved)
    for (const [weekday, startMinute, endMinute] of hours) await prisma.locationHours.upsert({ where: { locationId_weekday_startMinute_endMinute: { locationId: saved.id, weekday, startMinute, endMinute } }, create: { id: `booktrix-e2e-hours-${fixture.slug}-${item.slug}-${weekday}`, locationId: saved.id, weekday, startMinute, endMinute }, update: {} })
  }
  const memberships = new Map<string, { id: string; locations: string[] }>()
  for (const item of fixture.members) {
    const person = await upsertUser(`booktrix-e2e-user-${item.id.slice('booktrix-e2e-member-'.length)}`, item.email, item.name, item.role === 'OWNER' ? Role.OWNER : Role.USER)
    const saved = await prisma.businessMembership.upsert({ where: { businessId_userId: { businessId: business.id, userId: person.id } }, create: { id: item.id, businessId: business.id, userId: person.id, role: item.role }, update: { role: item.role, active: true } })
    memberships.set(item.id, { id: saved.id, locations: item.locations })
    for (const slug of item.locations) { const savedLocation = locations.get(slug)!; await prisma.locationAssignment.upsert({ where: { membershipId_locationId: { membershipId: saved.id, locationId: savedLocation.id } }, create: { membershipId: saved.id, locationId: savedLocation.id }, update: {} }) }
  }
  for (const item of fixture.offerings) {
    const saved = await prisma.serviceOffering.upsert({ where: { id: item.id }, create: { id: item.id, businessId: business.id, category: item.category, name: item.name, description: item.description, durationMinutes: item.minutes, priceCents: item.price, confirmationMode: item.mode, allowFullPayment: item.full, allowDeposit: Boolean(item.deposit), allowCash: item.cash, depositKind: item.deposit?.[0], depositValue: item.deposit?.[1] }, update: { category: item.category, name: item.name, description: item.description, durationMinutes: item.minutes, priceCents: item.price, confirmationMode: item.mode, allowFullPayment: item.full, allowDeposit: Boolean(item.deposit), allowCash: item.cash, depositKind: item.deposit?.[0], depositValue: item.deposit?.[1], active: true } })
    for (const slug of item.locations) {
      const savedLocation = locations.get(slug)!; await prisma.serviceLocation.upsert({ where: { offeringId_locationId: { offeringId: saved.id, locationId: savedLocation.id } }, create: { offeringId: saved.id, locationId: savedLocation.id }, update: { active: true } })
      for (const staffId of item.staff) { const savedMember = memberships.get(staffId)!; if (savedMember.locations.includes(slug)) await prisma.staffQualification.upsert({ where: { membershipId_offeringId_locationId: { membershipId: savedMember.id, offeringId: saved.id, locationId: savedLocation.id } }, create: { membershipId: savedMember.id, offeringId: saved.id, locationId: savedLocation.id }, update: { active: true } }) }
    }
  }
  for (const [memberId, savedMember] of Array.from(memberships.entries())) for (const slug of savedMember.locations) {
    const savedLocation = locations.get(slug)!; const hours = fixture.locations.find((item) => item.slug === slug)!.hours
    for (const [weekday, startMinute, endMinute] of hours) await prisma.staffSchedule.upsert({ where: { membershipId_locationId_weekday_startMinute_endMinute: { membershipId: savedMember.id, locationId: savedLocation.id, weekday, startMinute, endMinute } }, create: { id: `booktrix-e2e-schedule-${memberId.slice('booktrix-e2e-member-'.length)}-${slug}-${weekday}`, membershipId: savedMember.id, locationId: savedLocation.id, weekday, startMinute, endMinute }, update: {} })
  }
}

async function seedBookingJourneyFixtures() {
  const [owner, manager, staff, customer, accounts] = await Promise.all([upsertUser('booktrix-e2e-owner', 'owner.e2e@booktrix.test', 'E2E Owner', Role.OWNER), upsertUser('booktrix-e2e-manager', 'manager.e2e@booktrix.test', 'E2E Manager', Role.USER), upsertUser('booktrix-e2e-staff', 'staff.e2e@booktrix.test', 'Amara E2E', Role.USER), upsertUser('booktrix-e2e-customer', 'customer.e2e@booktrix.test', 'E2E Customer', Role.USER), upsertUser('booktrix-e2e-accounts', 'accounts.e2e@booktrix.test', 'E2E Accounts', Role.ACCOUNTANT)])
  const business = await prisma.business.upsert({ where: { slug: 'booktrix-e2e-studio' }, create: { id: 'booktrix-e2e-business', name: 'Booktrix E2E Studio', slug: 'booktrix-e2e-studio', status: 'PUBLISHED' }, update: { name: 'Booktrix E2E Studio', status: 'PUBLISHED' } })
  await prisma.businessSetup.upsert({ where: { businessId: business.id }, create: { businessId: business.id, profileComplete: true, firstLocationComplete: true, policiesAccepted: true, publicationReady: true }, update: { profileComplete: true, firstLocationComplete: true, policiesAccepted: true, publicationReady: true } })
  const castries = await prisma.location.upsert({ where: { businessId_slug: { businessId: business.id, slug: 'castries' } }, create: { id: 'booktrix-e2e-location-castries', businessId: business.id, slug: 'castries', name: 'E2E Castries Studio', address: '1 Test Street, Castries', isActive: true }, update: { name: 'E2E Castries Studio', isActive: true } })
  const rodneyBay = await prisma.location.upsert({ where: { businessId_slug: { businessId: business.id, slug: 'rodney-bay' } }, create: { id: 'booktrix-e2e-location-rodney', businessId: business.id, slug: 'rodney-bay', name: 'E2E Rodney Bay Studio', address: '2 Test Street, Rodney Bay', isActive: true }, update: { name: 'E2E Rodney Bay Studio', isActive: true } })
  const memberships = new Map<string, string>()
  for (const [person, role, id, locations] of [[owner, 'OWNER', 'booktrix-e2e-membership-owner', [castries, rodneyBay]], [manager, 'MANAGER', 'booktrix-e2e-membership-manager', [castries]], [staff, 'STAFF', 'booktrix-e2e-membership-staff', [castries, rodneyBay]], [accounts, 'ACCOUNTS', 'booktrix-e2e-membership-accounts', [castries]]] as const) { const saved = await prisma.businessMembership.upsert({ where: { businessId_userId: { businessId: business.id, userId: person.id } }, create: { id, businessId: business.id, userId: person.id, role }, update: { role, active: true } }); memberships.set(role, saved.id); for (const savedLocation of locations) await prisma.locationAssignment.upsert({ where: { membershipId_locationId: { membershipId: saved.id, locationId: savedLocation.id } }, create: { membershipId: saved.id, locationId: savedLocation.id }, update: {} }) }
  const massage = await prisma.serviceOffering.upsert({ where: { id: 'booktrix-e2e-offering-massage' }, create: { id: 'booktrix-e2e-offering-massage', businessId: business.id, category: 'Massage', name: 'E2E Deep Tissue Massage', description: 'Automatic confirmation fixture', durationMinutes: 60, preparationMinutes: 10, cleanupMinutes: 10, priceCents: 12000, confirmationMode: 'AUTOMATIC', allowFullPayment: true, allowCash: true }, update: { active: true } })
  const facial = await prisma.serviceOffering.upsert({ where: { id: 'booktrix-e2e-offering-facial' }, create: { id: 'booktrix-e2e-offering-facial', businessId: business.id, category: 'Skin care', name: 'E2E Classic Facial', description: 'Manual approval fixture', durationMinutes: 45, cleanupMinutes: 10, priceCents: 8500, confirmationMode: 'MANUAL', allowFullPayment: true, allowDeposit: true, allowCash: true, depositKind: 'PERCENTAGE', depositValue: 25 }, update: { active: true } })
  const staffMembershipId = memberships.get('STAFF')!
  for (const item of [massage, facial]) for (const savedLocation of [castries, rodneyBay]) { await prisma.serviceLocation.upsert({ where: { offeringId_locationId: { offeringId: item.id, locationId: savedLocation.id } }, create: { offeringId: item.id, locationId: savedLocation.id }, update: { active: true } }); await prisma.staffQualification.upsert({ where: { membershipId_offeringId_locationId: { membershipId: staffMembershipId, offeringId: item.id, locationId: savedLocation.id } }, create: { membershipId: staffMembershipId, offeringId: item.id, locationId: savedLocation.id }, update: { active: true } }) }
  for (const savedLocation of [castries, rodneyBay]) for (let weekday = 0; weekday < 7; weekday += 1) { await prisma.locationHours.upsert({ where: { locationId_weekday_startMinute_endMinute: { locationId: savedLocation.id, weekday, startMinute: 540, endMinute: 1020 } }, create: { id: `booktrix-e2e-hours-studio-${savedLocation.slug}-${weekday}`, locationId: savedLocation.id, weekday, startMinute: 540, endMinute: 1020 }, update: {} }); await prisma.staffSchedule.upsert({ where: { membershipId_locationId_weekday_startMinute_endMinute: { membershipId: staffMembershipId, locationId: savedLocation.id, weekday, startMinute: 540, endMinute: 1020 } }, create: { id: `booktrix-e2e-schedule-studio-${savedLocation.slug}-${weekday}`, membershipId: staffMembershipId, locationId: savedLocation.id, weekday, startMinute: 540, endMinute: 1020 }, update: {} }) }
  await prisma.staffTimeOff.upsert({ where: { id: 'booktrix-e2e-time-off' }, create: { id: 'booktrix-e2e-time-off', membershipId: staffMembershipId, locationId: rodneyBay.id, startsAt: new Date('2030-01-15T13:00:00Z'), endsAt: new Date('2030-01-15T17:00:00Z'), reason: 'E2E fixture' }, update: {} })
  await prisma.bookingHold.upsert({ where: { token: 'booktrix-e2e-expired-hold' }, create: { id: 'booktrix-e2e-expired-hold-id', token: 'booktrix-e2e-expired-hold', idempotencyKey: 'booktrix-e2e-expired-hold', businessId: business.id, customerId: customer.id, checkoutIdentity: 'booktrix-e2e-expired', expiresAt: new Date('2020-01-01T00:00:00Z') }, update: { consumedAt: null, expiresAt: new Date('2020-01-01T00:00:00Z') } })
  await seedWorkspaceSecurityFixtures({ business, castries, rodneyBay, owner, customer, memberships, offeringId: massage.id })
}

// Task 6 fixtures: an inactive location, a published booking policy row, the
// three-state invitation lifecycle (pending/expired/revoked, each with a
// fixed plaintext token so specs can replay them), and cash-due /
// partially-collected / foreign-location booking orders with append-only
// cash evidence. Every id is fixed and every mutation is an upsert keyed by
// that id (or a unique business+idempotencyKey pair), so reruns update the
// same rows in place instead of creating duplicates.
async function seedWorkspaceSecurityFixtures(input: {
  business: { id: string }
  castries: { id: string; slug: string }
  rodneyBay: { id: string; slug: string }
  owner: { id: string }
  customer: { id: string }
  memberships: Map<string, string>
  offeringId: string
}) {
  const { business, castries, rodneyBay, owner, customer, memberships, offeringId } = input
  const now = new Date()

  await prisma.location.upsert({
    where: { businessId_slug: { businessId: business.id, slug: 'retired' } },
    create: { id: workspaceSecurityFixtures.inactiveLocationId, businessId: business.id, slug: 'retired', name: 'E2E Retired Location', address: '9 Test Street, Castries', isActive: false },
    update: { name: 'E2E Retired Location', isActive: false },
  })

  const staffCastriesOnly = workspaceSecurityFixtures.staffCastriesOnly
  const staffCastriesUser = await upsertUser(staffCastriesOnly.userId, staffCastriesOnly.email, staffCastriesOnly.name, Role.USER)
  const staffCastriesMembership = await prisma.businessMembership.upsert({
    where: { businessId_userId: { businessId: business.id, userId: staffCastriesUser.id } },
    create: { id: staffCastriesOnly.membershipId, businessId: business.id, userId: staffCastriesUser.id, role: 'STAFF' },
    update: { role: 'STAFF', active: true },
  })
  await prisma.locationAssignment.upsert({ where: { membershipId_locationId: { membershipId: staffCastriesMembership.id, locationId: castries.id } }, create: { membershipId: staffCastriesMembership.id, locationId: castries.id }, update: {} })
  await prisma.staffQualification.upsert({ where: { membershipId_offeringId_locationId: { membershipId: staffCastriesMembership.id, offeringId, locationId: castries.id } }, create: { membershipId: staffCastriesMembership.id, offeringId, locationId: castries.id }, update: { active: true } })

  await prisma.businessPolicy.upsert({
    where: { businessId: business.id },
    create: { businessId: business.id, currency: 'XCD', timezone: 'America/St_Lucia', cancellationPolicyText: 'Cancel or reschedule at least 24 hours before your appointment.' },
    update: { currency: 'XCD', timezone: 'America/St_Lucia', cancellationPolicyText: 'Cancel or reschedule at least 24 hours before your appointment.' },
  })

  const invitations = workspaceSecurityFixtures.invitations
  const pendingExpiresAt = pendingInvitationWindow(now).expiresAt
  const expiredExpiresAt = expiredInvitationWindow(now).expiresAt

  const pending = await prisma.businessInvitation.upsert({
    where: { id: invitations.pending.id },
    create: { id: invitations.pending.id, businessId: business.id, normalizedEmail: invitations.pending.email, invitedName: 'E2E Pending Invitee', role: 'STAFF', tokenHash: hashToken(invitations.pending.token), expiresAt: pendingExpiresAt, inviterId: owner.id, activeKey: 'booktrix-e2e-active-key-pending' },
    update: { tokenHash: hashToken(invitations.pending.token), expiresAt: pendingExpiresAt, acceptedAt: null, revokedAt: null, activeKey: 'booktrix-e2e-active-key-pending' },
  })
  await prisma.businessInvitationLocation.upsert({ where: { invitationId_locationId: { invitationId: pending.id, locationId: castries.id } }, create: { invitationId: pending.id, locationId: castries.id }, update: {} })

  const expired = await prisma.businessInvitation.upsert({
    where: { id: invitations.expired.id },
    create: { id: invitations.expired.id, businessId: business.id, normalizedEmail: invitations.expired.email, invitedName: 'E2E Expired Invitee', role: 'STAFF', tokenHash: hashToken(invitations.expired.token), expiresAt: expiredExpiresAt, inviterId: owner.id, activeKey: null },
    update: { tokenHash: hashToken(invitations.expired.token), expiresAt: expiredExpiresAt, acceptedAt: null, revokedAt: null, activeKey: null },
  })
  await prisma.businessInvitationLocation.upsert({ where: { invitationId_locationId: { invitationId: expired.id, locationId: castries.id } }, create: { invitationId: expired.id, locationId: castries.id }, update: {} })

  const revoked = await prisma.businessInvitation.upsert({
    where: { id: invitations.revoked.id },
    create: { id: invitations.revoked.id, businessId: business.id, normalizedEmail: invitations.revoked.email, invitedName: 'E2E Revoked Invitee', role: 'STAFF', tokenHash: hashToken(invitations.revoked.token), expiresAt: pendingExpiresAt, revokedAt: now, inviterId: owner.id, activeKey: null },
    update: { tokenHash: hashToken(invitations.revoked.token), expiresAt: pendingExpiresAt, revokedAt: now, acceptedAt: null, activeKey: null },
  })
  await prisma.businessInvitationLocation.upsert({ where: { invitationId_locationId: { invitationId: revoked.id, locationId: castries.id } }, create: { invitationId: revoked.id, locationId: castries.id }, update: {} })

  const staffMembershipId = memberships.get('STAFF')!
  const accountsMembershipId = memberships.get('ACCOUNTS')!
  const cashOrders = workspaceSecurityFixtures.cashOrders

  async function upsertCashOrder(fixture: { id: string; cashDueCents: number }, locationId: string, daysAhead: number) {
    const { startsAt, endsAt } = stLuciaFutureAppointment(now, daysAhead)
    return prisma.bookingOrder.upsert({
      where: { id: fixture.id },
      create: {
        id: fixture.id, businessId: business.id, customerId: customer.id, idempotencyKey: `${fixture.id}-idempotency`,
        status: 'CONFIRMED', paymentChoice: 'CASH', subtotalCents: fixture.cashDueCents, paidCents: 0, dueOnlineCents: 0, dueAtAppointmentCents: fixture.cashDueCents,
        Segments: { create: [{ offeringId, locationId, membershipId: staffMembershipId, startsAt, endsAt, occupiedStartsAt: startsAt, occupiedEndsAt: endsAt, attendeeCount: 1, priceCents: fixture.cashDueCents, confirmationMode: 'AUTOMATIC', status: 'CONFIRMED' }] },
      },
      update: { status: 'CONFIRMED', paymentChoice: 'CASH', subtotalCents: fixture.cashDueCents, dueAtAppointmentCents: fixture.cashDueCents },
    })
  }

  await upsertCashOrder(cashOrders.dueCastries, castries.id, 2)
  const partialOrder = await upsertCashOrder(cashOrders.partialCastries, castries.id, 3)
  await upsertCashOrder(cashOrders.dueRodneyBay, rodneyBay.id, 4)

  await prisma.cashCollection.upsert({
    where: { businessId_idempotencyKey: { businessId: business.id, idempotencyKey: `${cashOrders.partialCastries.id}-collection` } },
    create: { id: `${cashOrders.partialCastries.id}-collection`, businessId: business.id, orderId: partialOrder.id, locationId: castries.id, collectorId: accountsMembershipId, kind: 'COLLECTION', amountCents: cashOrders.partialCastries.cashCollectedCents, idempotencyKey: `${cashOrders.partialCastries.id}-collection`, note: 'Partial cash collected at checkout.' },
    update: {},
  })
}

async function main() { await preflightFixtureOwnership(); for (const fixture of demoBusinesses) await seedDemoBusiness(fixture); await seedBookingJourneyFixtures(); console.info('Booktrix Phase 2 E2E fixtures are ready.') }
if (process.argv[1]?.endsWith('seed-phase2-e2e.ts')) main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(() => prisma.$disconnect())
