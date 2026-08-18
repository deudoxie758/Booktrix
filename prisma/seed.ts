import 'dotenv/config'
import { PrismaClient, Role } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
	// Clear existing data
	await prisma.locationAssignment.deleteMany()
	await prisma.businessApplication.deleteMany()
	await prisma.businessSetup.deleteMany()
	await prisma.businessMembership.deleteMany()
	await prisma.location.deleteMany()
	await prisma.business.deleteMany()
	await prisma.cancellation.deleteMany()
	await prisma.booking.deleteMany()
	await prisma.employee.deleteMany()
	await prisma.subservice.deleteMany()
	await prisma.service.deleteMany()
	await prisma.spa.deleteMany()
	await prisma.user.deleteMany()

	const password = await hash('password123', 10)

	// Create Users
	const owner1 = await prisma.user.create({
		data: { email: 'owner@example.com', name: 'Maria Johnson', hashedPassword: password, role: Role.OWNER },
	})
	const owner2 = await prisma.user.create({
		data: { email: 'owner2@example.com', name: 'David Williams', hashedPassword: password, role: Role.OWNER },
	})
	const owner3 = await prisma.user.create({
		data: { email: 'owner3@example.com', name: 'Sarah Chen', hashedPassword: password, role: Role.OWNER },
	})
	const owner4 = await prisma.user.create({
		data: { email: 'owner4@example.com', name: 'Nina Desouza', hashedPassword: password, role: Role.OWNER },
	})
	const owner5 = await prisma.user.create({
		data: { email: 'owner5@example.com', name: 'Marcus Thompson', hashedPassword: password, role: Role.OWNER },
	})
	await prisma.user.create({
		data: { email: 'customer@example.com', name: 'John Customer', hashedPassword: password, role: Role.USER },
	})
	await prisma.user.create({
		data: { email: 'jane.doe@example.com', name: 'Jane Doe', hashedPassword: password, role: Role.USER },
	})
	await prisma.user.create({
		data: { email: 'oliver.smith@example.com', name: 'Oliver Smith', hashedPassword: password, role: Role.USER },
	})
	await prisma.user.create({
		data: { email: 'monique.brun@example.com', name: 'Monique Brun', hashedPassword: password, role: Role.USER },
	})
	await prisma.user.create({
		data: { email: 'ryan.kelly@example.com', name: 'Ryan Kelly', hashedPassword: password, role: Role.USER },
	})
	const accountant = await prisma.user.create({
		data: { email: 'accountant@example.com', name: 'Ayesha Parker', hashedPassword: password, role: Role.ACCOUNTANT },
	})
	const manager = await prisma.user.create({ data: { email: 'manager@example.com', name: 'Kai Joseph', hashedPassword: password, role: Role.USER } })
	const staff = await prisma.user.create({ data: { email: 'staff@example.com', name: 'Amara Felix', hashedPassword: password, role: Role.USER } })

	// ─── Spa 1: Emerald Bay Spa (Massage & Facial) ───────────────────────────
	const spa1 = await prisma.spa.create({
		data: {
			ownerId: owner1.id,
			name: 'Emerald Bay Spa',
			slug: 'emerald-bay-spa',
			description: 'Modern wellness retreat offering therapeutic massages and rejuvenating facials in the heart of Saint Lucia.',
			coverUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&h=400&fit=crop&q=80',
			address: '123 Beach Road, Castries, Saint Lucia',
			phone: '+1 758-555-0100',
			email: 'info@emeraldbay.com',
			businessHours: { mon: ['09:00-17:00'], tue: ['09:00-17:00'], wed: ['09:00-17:00'], thu: ['09:00-17:00'], fri: ['09:00-18:00'], sat: ['10:00-16:00'], sun: [] },
		},
	})
	const massageService1 = await prisma.service.create({ data: { spaId: spa1.id, name: 'Massage Therapy', description: 'Professional therapeutic massages.' } })
	const facialService1 = await prisma.service.create({ data: { spaId: spa1.id, name: 'Facials', description: 'Rejuvenating facial treatments.' } })
	await prisma.subservice.createMany({ data: [
		{ spaId: spa1.id, serviceId: massageService1.id, name: 'Deep Tissue Massage', description: 'Intense pressure to relieve chronic tension and muscle knots', durationMin: 60, priceCents: 12000 },
		{ spaId: spa1.id, serviceId: massageService1.id, name: 'Swedish Massage', description: 'Gentle, relaxing full-body massage with long smooth strokes', durationMin: 60, priceCents: 10000 },
		{ spaId: spa1.id, serviceId: massageService1.id, name: 'Hot Stone Massage', description: 'Heated basalt stones for deep muscle relaxation', durationMin: 90, priceCents: 15000 },
		{ spaId: spa1.id, serviceId: facialService1.id, name: 'Classic Facial', description: 'Deep cleansing, exfoliation and hydration treatment', durationMin: 45, priceCents: 8500 },
		{ spaId: spa1.id, serviceId: facialService1.id, name: 'Anti-Aging Facial', description: 'Collagen-boosting treatment to reduce fine lines', durationMin: 60, priceCents: 12500 },
	]})
	await prisma.employee.createMany({ data: [
		{ spaId: spa1.id, name: 'Ava Thomas', bio: 'Senior massage therapist with 10+ years experience in Swedish and deep tissue massage', schedule: { mon: ['09:00-17:00'], tue: ['09:00-17:00'], wed: ['09:00-17:00'] } },
		{ spaId: spa1.id, name: 'Noah James', bio: 'Certified deep tissue and hot stone massage specialist', schedule: { thu: ['09:00-17:00'], fri: ['09:00-18:00'], sat: ['10:00-16:00'] } },
		{ spaId: spa1.id, name: 'Olivia Martinez', bio: 'Licensed esthetician specializing in anti-aging facials and skin rejuvenation', schedule: { mon: ['09:00-17:00'], wed: ['09:00-17:00'], fri: ['09:00-18:00'] } },
	]})

	// ─── Spa 2: Paradise Wellness Center (Body Treatments & Yoga) ────────────
	const spa2 = await prisma.spa.create({
		data: {
			ownerId: owner2.id,
			name: 'Paradise Wellness Center',
			slug: 'paradise-wellness',
			description: 'Luxury wellness center offering holistic body treatments, yoga, and meditation with stunning ocean views.',
			coverUrl: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=800&h=400&fit=crop&q=80',
			address: '456 Ocean Drive, Soufrière, Saint Lucia',
			phone: '+1 758-555-0200',
			email: 'contact@paradisewellness.com',
			colorPrimary: '#3B82F6',
			businessHours: { mon: ['08:00-19:00'], tue: ['08:00-19:00'], wed: ['08:00-19:00'], thu: ['08:00-19:00'], fri: ['08:00-20:00'], sat: ['09:00-20:00'], sun: ['10:00-18:00'] },
		},
	})
	const spaService2 = await prisma.service.create({ data: { spaId: spa2.id, name: 'Body Treatments', description: 'Full body pampering and detox.' } })
	const yogaService2 = await prisma.service.create({ data: { spaId: spa2.id, name: 'Wellness Classes', description: 'Yoga, meditation and breathwork.' } })
	await prisma.subservice.createMany({ data: [
		{ spaId: spa2.id, serviceId: spaService2.id, name: 'Body Scrub & Wrap', description: 'Full body exfoliation followed by a nourishing mineral wrap', durationMin: 75, priceCents: 14000 },
		{ spaId: spa2.id, serviceId: spaService2.id, name: 'Detox Body Treatment', description: 'Clay mask with lymphatic drainage massage', durationMin: 90, priceCents: 16500 },
		{ spaId: spa2.id, serviceId: yogaService2.id, name: 'Private Yoga Session', description: 'One-on-one yoga instruction tailored to your level', durationMin: 60, priceCents: 9000 },
		{ spaId: spa2.id, serviceId: yogaService2.id, name: 'Guided Meditation', description: 'Mindfulness and breathwork for deep relaxation', durationMin: 45, priceCents: 5000 },
		{ spaId: spa2.id, serviceId: yogaService2.id, name: 'Group Yoga Class', description: 'Energizing group flow class for all levels', durationMin: 60, priceCents: 3500 },
	]})
	await prisma.employee.createMany({ data: [
		{ spaId: spa2.id, name: 'Liam Rodriguez', bio: 'Certified yoga instructor and meditation coach with 8 years experience', schedule: { mon: ['08:00-19:00'], tue: ['08:00-19:00'], wed: ['08:00-19:00'], thu: ['08:00-19:00'] } },
		{ spaId: spa2.id, name: 'Emma Wilson', bio: 'Body treatment and detox specialist trained in European spa techniques', schedule: { fri: ['08:00-20:00'], sat: ['09:00-20:00'], sun: ['10:00-18:00'] } },
	]})

	// ─── Spa 3: Tranquil Touch Spa (Aromatherapy & Reflexology) ──────────────
	const spa3 = await prisma.spa.create({
		data: {
			ownerId: owner3.id,
			name: 'Tranquil Touch Spa',
			slug: 'tranquil-touch',
			description: 'Intimate boutique spa specializing in aromatherapy, reflexology, and couples treatments.',
			coverUrl: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&h=400&fit=crop&q=80',
			address: '789 Sunset Boulevard, Gros Islet, Saint Lucia',
			phone: '+1 758-555-0300',
			email: 'hello@tranquiltouch.com',
			colorPrimary: '#8B5CF6',
			businessHours: { mon: ['10:00-18:00'], tue: ['10:00-18:00'], wed: ['10:00-18:00'], thu: ['10:00-18:00'], fri: ['10:00-19:00'], sat: ['10:00-17:00'], sun: [] },
		},
	})
	const aromaService3 = await prisma.service.create({ data: { spaId: spa3.id, name: 'Aromatherapy', description: 'Essential oil-based healing treatments.' } })
	await prisma.subservice.createMany({ data: [
		{ spaId: spa3.id, serviceId: aromaService3.id, name: 'Aromatherapy Massage', description: 'Custom essential oil blend full-body massage', durationMin: 75, priceCents: 13500 },
		{ spaId: spa3.id, serviceId: aromaService3.id, name: 'Reflexology', description: 'Therapeutic pressure point foot and hand massage', durationMin: 45, priceCents: 7500 },
		{ spaId: spa3.id, serviceId: aromaService3.id, name: 'Couples Massage', description: 'Side-by-side relaxation experience for two', durationMin: 60, priceCents: 22000 },
	]})
	await prisma.employee.createMany({ data: [
		{ spaId: spa3.id, name: 'Sophia Anderson', bio: 'Certified aromatherapist and reflexologist with a passion for holistic healing', schedule: { mon: ['10:00-18:00'], wed: ['10:00-18:00'], fri: ['10:00-19:00'] } },
		{ spaId: spa3.id, name: 'James Brown', bio: 'Holistic wellness practitioner specializing in couples and aromatherapy treatments', schedule: { tue: ['10:00-18:00'], thu: ['10:00-18:00'], sat: ['10:00-17:00'] } },
	]})

	// ─── Spa 4: Serenity Retreat (Sauna & Steam) ─────────────────────────────
	const spa4 = await prisma.spa.create({
		data: {
			ownerId: owner1.id,
			name: 'Serenity Retreat',
			slug: 'serenity-retreat',
			description: 'Oceanfront wellness retreat featuring infrared saunas, steam rooms, and Caribbean heat therapies.',
			coverUrl: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800&h=400&fit=crop&q=80',
			address: '321 Caribbean Lane, Rodney Bay, Saint Lucia',
			phone: '+1 758-555-0400',
			email: 'reservations@serenityretreat.com',
			colorPrimary: '#10B981',
			businessHours: { mon: ['09:00-17:00'], tue: ['09:00-17:00'], wed: ['09:00-17:00'], thu: ['09:00-17:00'], fri: ['09:00-18:00'], sat: ['10:00-16:00'], sun: [] },
		},
	})
	const heatService4 = await prisma.service.create({ data: { spaId: spa4.id, name: 'Heat Therapies', description: 'Sauna, steam and thermal treatments.' } })
	await prisma.subservice.createMany({ data: [
		{ spaId: spa4.id, serviceId: heatService4.id, name: 'Infrared Sauna', description: 'Full-spectrum infrared heat for detox and deep tissue relief', durationMin: 45, priceCents: 8000 },
		{ spaId: spa4.id, serviceId: heatService4.id, name: 'Steam Room Session', description: 'Eucalyptus-infused steam for skin and respiratory benefits', durationMin: 30, priceCents: 5500 },
		{ spaId: spa4.id, serviceId: heatService4.id, name: 'Sauna & Massage Combo', description: 'Infrared sauna session followed by a relaxation massage', durationMin: 90, priceCents: 16000 },
	]})
	await prisma.employee.createMany({ data: [
		{ spaId: spa4.id, name: 'Marcus Reid', bio: 'Wellness therapist specializing in heat therapy and post-sauna massage', schedule: { mon: ['09:00-17:00'], wed: ['09:00-17:00'], fri: ['09:00-18:00'] } },
		{ spaId: spa4.id, name: 'Priya Nair', bio: 'Certified thermal therapy specialist with training in Scandinavian sauna techniques', schedule: { tue: ['09:00-17:00'], thu: ['09:00-17:00'], sat: ['10:00-16:00'] } },
	]})

	// ─── Spa 5: Tropical Glow Beauty Salon (Hair & Makeup) ───────────────────
	const spa5 = await prisma.spa.create({
		data: {
			ownerId: owner2.id,
			name: 'Tropical Glow Beauty Salon',
			slug: 'tropical-glow',
			description: 'Premier beauty salon offering expert hair styling, coloring, and professional makeup for every occasion.',
			coverUrl: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&h=400&fit=crop&q=80',
			address: '654 Wellness Street, Vieux Fort, Saint Lucia',
			phone: '+1 758-555-0500',
			email: 'glow@beautysalon.com',
			colorPrimary: '#F59E0B',
			businessHours: { mon: ['09:00-19:00'], tue: ['09:00-19:00'], wed: ['09:00-19:00'], thu: ['09:00-19:00'], fri: ['09:00-20:00'], sat: ['10:00-18:00'], sun: ['12:00-17:00'] },
		},
	})
	const hairService5 = await prisma.service.create({ data: { spaId: spa5.id, name: 'Hair Services', description: 'Professional hair styling and coloring.' } })
	const makeupService5 = await prisma.service.create({ data: { spaId: spa5.id, name: 'Makeup', description: 'Professional makeup for any occasion.' } })
	await prisma.subservice.createMany({ data: [
		{ spaId: spa5.id, serviceId: hairService5.id, name: 'Haircut & Style', description: 'Precision cut with professional blow-dry and styling', durationMin: 45, priceCents: 6500 },
		{ spaId: spa5.id, serviceId: hairService5.id, name: 'Hair Coloring', description: 'Full color or highlights with toner and style', durationMin: 90, priceCents: 15000 },
		{ spaId: spa5.id, serviceId: hairService5.id, name: 'Blowout & Style', description: 'Shampoo, blow-dry and finish styling', durationMin: 30, priceCents: 4500 },
		{ spaId: spa5.id, serviceId: makeupService5.id, name: 'Bridal Makeup', description: 'Full glam bridal makeup with lashes and setting spray', durationMin: 75, priceCents: 15000 },
		{ spaId: spa5.id, serviceId: makeupService5.id, name: 'Event Makeup', description: 'Flawless makeup for any special occasion', durationMin: 45, priceCents: 8000 },
		{ spaId: spa5.id, serviceId: makeupService5.id, name: 'Makeup Touch-up', description: 'Quick refresh and touch-up application', durationMin: 30, priceCents: 5000 },
	]})
	await prisma.employee.createMany({ data: [
		{ spaId: spa5.id, name: 'Chanelle Pierre', bio: 'Master hair stylist with 12 years experience in cuts, color and Caribbean hair textures', schedule: { mon: ['09:00-19:00'], tue: ['09:00-19:00'], wed: ['09:00-19:00'] } },
		{ spaId: spa5.id, name: 'Brianna St. Clair', bio: 'Certified makeup artist specializing in bridal and editorial looks', schedule: { thu: ['09:00-19:00'], fri: ['09:00-20:00'], sat: ['10:00-18:00'] } },
		{ spaId: spa5.id, name: 'Kezia Edmond', bio: 'Hair coloring specialist trained in balayage, ombre and vivid color techniques', schedule: { wed: ['09:00-19:00'], fri: ['09:00-20:00'], sun: ['12:00-17:00'] } },
	]})

	// ─── Spa 6: Rejuvenation Nails & Beauty Studio (Nails & Waxing) ──────────
	const spa6 = await prisma.spa.create({
		data: {
			ownerId: owner3.id,
			name: 'Rejuvenation Nails & Beauty Studio',
			slug: 'rejuvenation-haven',
			description: 'Full-service nail and beauty studio with expert nail technicians offering gel, acrylic, nail art, waxing and threading.',
			coverUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&h=400&fit=crop&q=80',
			address: '987 Beauty Boulevard, Pitons Bay, Saint Lucia',
			phone: '+1 758-555-0600',
			email: 'nails@rejuvenation.com',
			colorPrimary: '#EC4899',
			businessHours: { mon: ['10:00-18:00'], tue: ['10:00-18:00'], wed: ['10:00-18:00'], thu: ['10:00-18:00'], fri: ['10:00-19:00'], sat: ['09:00-17:00'], sun: [] },
		},
	})
	const nailService6 = await prisma.service.create({ data: { spaId: spa6.id, name: 'Nail Services', description: 'Manicures, pedicures, gel and nail art.' } })
	const waxService6 = await prisma.service.create({ data: { spaId: spa6.id, name: 'Waxing & Threading', description: 'Professional hair removal services.' } })
	await prisma.subservice.createMany({ data: [
		{ spaId: spa6.id, serviceId: nailService6.id, name: 'Gel Manicure', description: 'Long-lasting gel polish with cuticle care and hand massage', durationMin: 45, priceCents: 7500 },
		{ spaId: spa6.id, serviceId: nailService6.id, name: 'Gel Pedicure', description: 'Relaxing pedicure with gel polish and foot soak', durationMin: 50, priceCents: 8500 },
		{ spaId: spa6.id, serviceId: nailService6.id, name: 'Nail Art Design', description: 'Custom hand-painted nail art designs', durationMin: 60, priceCents: 10000 },
		{ spaId: spa6.id, serviceId: nailService6.id, name: 'Classic Mani & Pedi Combo', description: 'Full mani-pedi with polish of choice', durationMin: 75, priceCents: 11000 },
		{ spaId: spa6.id, serviceId: waxService6.id, name: 'Full Leg Wax', description: 'Smooth full leg waxing with soothing aftercare', durationMin: 45, priceCents: 7000 },
		{ spaId: spa6.id, serviceId: waxService6.id, name: 'Eyebrow Threading', description: 'Precise brow shaping using threading technique', durationMin: 20, priceCents: 3000 },
		{ spaId: spa6.id, serviceId: waxService6.id, name: 'Full Body Wax', description: 'Head-to-toe professional waxing service', durationMin: 90, priceCents: 14000 },
	]})
	await prisma.employee.createMany({ data: [
		{ spaId: spa6.id, name: 'Tanya Joseph', bio: 'Expert nail technician with 8 years experience in gel, acrylic and intricate nail art', schedule: { mon: ['10:00-18:00'], tue: ['10:00-18:00'], wed: ['10:00-18:00'] } },
		{ spaId: spa6.id, name: 'Alicia Fontaine', bio: 'Certified nail artist specializing in custom designs and gel nail extensions', schedule: { thu: ['10:00-18:00'], fri: ['10:00-19:00'], sat: ['09:00-17:00'] } },
		{ spaId: spa6.id, name: 'Rochelle Darius', bio: 'Waxing and threading specialist trained in sensitive skin techniques', schedule: { wed: ['10:00-18:00'], fri: ['10:00-19:00'], sat: ['09:00-17:00'] } },
	]})

	// ─── Spa 7: Wellness Oasis (Health & Nutrition) ───────────────────────────
	const spa7 = await prisma.spa.create({
		data: {
			ownerId: owner1.id,
			name: 'Wellness Oasis',
			slug: 'wellness-oasis',
			description: 'Complete wellness center offering personalized health consultations, nutrition coaching, and stress management programs.',
			coverUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop&q=80',
			address: '159 Health Road, Choiseul, Saint Lucia',
			phone: '+1 758-555-0700',
			email: 'wellness@oasiscenter.com',
			colorPrimary: '#06B6D4',
			businessHours: { mon: ['08:00-19:00'], tue: ['08:00-19:00'], wed: ['08:00-19:00'], thu: ['08:00-19:00'], fri: ['08:00-20:00'], sat: ['09:00-18:00'], sun: ['10:00-16:00'] },
		},
	})
	const wellService7 = await prisma.service.create({ data: { spaId: spa7.id, name: 'Wellness Programs', description: 'Holistic health and nutrition programs.' } })
	await prisma.subservice.createMany({ data: [
		{ spaId: spa7.id, serviceId: wellService7.id, name: 'Health Consultation', description: 'Comprehensive wellness assessment with personalized health plan', durationMin: 60, priceCents: 15000 },
		{ spaId: spa7.id, serviceId: wellService7.id, name: 'Nutrition Coaching', description: 'Personalized dietary guidance and meal planning', durationMin: 45, priceCents: 12000 },
		{ spaId: spa7.id, serviceId: wellService7.id, name: 'Stress Management Session', description: 'Guided techniques for managing stress and improving mental wellness', durationMin: 60, priceCents: 10000 },
	]})
	await prisma.employee.createMany({ data: [
		{ spaId: spa7.id, name: 'Dr. Camille Blanc', bio: 'Certified holistic health practitioner with a background in integrative medicine', schedule: { mon: ['08:00-19:00'], tue: ['08:00-19:00'], thu: ['08:00-19:00'] } },
		{ spaId: spa7.id, name: 'Trevor Auguste', bio: 'Registered nutritionist and wellness coach specializing in Caribbean dietary habits', schedule: { wed: ['08:00-19:00'], fri: ['08:00-20:00'], sat: ['09:00-18:00'] } },
	]})

	// ─── Spa 8: Blissful Sanctuary (Holistic & Energy Healing) ───────────────
	const spa8 = await prisma.spa.create({
		data: {
			ownerId: owner2.id,
			name: 'Blissful Sanctuary',
			slug: 'blissful-sanctuary',
			description: 'A peaceful sanctuary for holistic healing including chakra balancing, crystal therapy, and Reiki energy work.',
			coverUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&h=400&fit=crop&q=80',
			address: '753 Healing Lane, Laborie, Saint Lucia',
			phone: '+1 758-555-0800',
			email: 'bliss@sanctuary.com',
			colorPrimary: '#8B5CF6',
			businessHours: { mon: ['09:00-18:00'], tue: ['09:00-18:00'], wed: ['09:00-18:00'], thu: ['09:00-18:00'], fri: ['09:00-19:00'], sat: ['10:00-17:00'], sun: ['11:00-16:00'] },
		},
	})
	const holisticService8 = await prisma.service.create({ data: { spaId: spa8.id, name: 'Holistic Healing', description: 'Energy, chakra and crystal healing.' } })
	await prisma.subservice.createMany({ data: [
		{ spaId: spa8.id, serviceId: holisticService8.id, name: 'Chakra Balancing', description: 'Full chakra assessment and energy alignment session', durationMin: 75, priceCents: 11000 },
		{ spaId: spa8.id, serviceId: holisticService8.id, name: 'Crystal Healing', description: 'Therapeutic placement of healing crystals for energy restoration', durationMin: 60, priceCents: 9500 },
		{ spaId: spa8.id, serviceId: holisticService8.id, name: 'Reiki Session', description: 'Japanese energy healing technique for stress reduction and relaxation', durationMin: 60, priceCents: 10000 },
	]})
	await prisma.employee.createMany({ data: [
		{ spaId: spa8.id, name: 'Luna Celestine', bio: 'Certified Reiki master and chakra healing practitioner with 15 years experience', schedule: { mon: ['09:00-18:00'], wed: ['09:00-18:00'], fri: ['09:00-19:00'] } },
		{ spaId: spa8.id, name: 'Elijah Francis', bio: 'Crystal healing therapist and energy worker trained in multiple holistic modalities', schedule: { tue: ['09:00-18:00'], thu: ['09:00-18:00'], sat: ['10:00-17:00'] } },
	]})

	// ─── Spa 9: Coastal Escape Spa (Hydrotherapy) ────────────────────────────
	const spa9 = await prisma.spa.create({
		data: {
			ownerId: owner3.id,
			name: 'Coastal Escape Spa',
			slug: 'coastal-escape',
			description: 'Beachfront spa specializing in water-based hydrotherapy and ocean-inspired thalassotherapy treatments.',
			coverUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=400&fit=crop&q=80',
			address: '852 Shore Drive, Canaries, Saint Lucia',
			phone: '+1 758-555-0900',
			email: 'escape@coastal.com',
			colorPrimary: '#0EA5E9',
			businessHours: { mon: ['08:00-19:00'], tue: ['08:00-19:00'], wed: ['08:00-19:00'], thu: ['08:00-19:00'], fri: ['08:00-20:00'], sat: ['09:00-19:00'], sun: ['10:00-17:00'] },
		},
	})
	const waterService9 = await prisma.service.create({ data: { spaId: spa9.id, name: 'Water Therapies', description: 'Hydrotherapy and aquatic treatments.' } })
	await prisma.subservice.createMany({ data: [
		{ spaId: spa9.id, serviceId: waterService9.id, name: 'Hydrotherapy Bath', description: 'Therapeutic jet water immersion with mineral salts', durationMin: 45, priceCents: 10000 },
		{ spaId: spa9.id, serviceId: waterService9.id, name: 'Salt Water Pool Therapy', description: 'Guided ocean salt therapeutic pool session', durationMin: 60, priceCents: 9000 },
		{ spaId: spa9.id, serviceId: waterService9.id, name: 'Thalassotherapy', description: 'Seaweed and ocean mineral full-body treatment', durationMin: 75, priceCents: 13000 },
	]})
	await prisma.employee.createMany({ data: [
		{ spaId: spa9.id, name: 'Nadine Gustave', bio: 'Hydrotherapy specialist and aquatic wellness therapist with 7 years experience', schedule: { mon: ['08:00-19:00'], wed: ['08:00-19:00'], fri: ['08:00-20:00'] } },
		{ spaId: spa9.id, name: 'Kevin St. Rose', bio: 'Certified thalassotherapy and marine wellness treatment specialist', schedule: { tue: ['08:00-19:00'], thu: ['08:00-19:00'], sat: ['09:00-19:00'] } },
	]})

	// ─── Spa 10: Harmony Healing Center (Traditional Caribbean Healing) ───────
	const spa10 = await prisma.spa.create({
		data: {
			ownerId: owner1.id,
			name: 'Harmony Healing Center',
			slug: 'harmony-healing',
			description: 'Traditional Caribbean healing practices blended with modern wellness, featuring herbal therapies and bush bath rituals.',
			coverUrl: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800&h=400&fit=crop&q=80',
			address: '246 Harmony Lane, Dennery, Saint Lucia',
			phone: '+1 758-555-1000',
			email: 'info@harmonyhealing.com',
			colorPrimary: '#14B8A6',
			businessHours: { mon: ['09:00-17:00'], tue: ['09:00-17:00'], wed: ['09:00-17:00'], thu: ['09:00-17:00'], fri: ['09:00-18:00'], sat: ['10:00-16:00'], sun: [] },
		},
	})
	const healService10 = await prisma.service.create({ data: { spaId: spa10.id, name: 'Traditional Healing', description: 'Caribbean herbal and pressure-point therapies.' } })
	await prisma.subservice.createMany({ data: [
		{ spaId: spa10.id, serviceId: healService10.id, name: 'Herbal Therapy', description: 'Traditional Caribbean herbal compresses and healing plant treatments', durationMin: 60, priceCents: 10500 },
		{ spaId: spa10.id, serviceId: healService10.id, name: 'Acupressure', description: 'Traditional pressure point body therapy for pain relief', durationMin: 45, priceCents: 8500 },
		{ spaId: spa10.id, serviceId: healService10.id, name: 'Bush Bath Ritual', description: 'Traditional Caribbean cleansing bath with local medicinal herbs', durationMin: 60, priceCents: 9000 },
	]})
	await prisma.employee.createMany({ data: [
		{ spaId: spa10.id, name: 'Mama Celestine', bio: 'Third-generation Caribbean herbal healer with deep knowledge of local medicinal plants', schedule: { mon: ['09:00-17:00'], tue: ['09:00-17:00'], wed: ['09:00-17:00'] } },
		{ spaId: spa10.id, name: 'Andre Hippolyte', bio: 'Traditional healing practitioner specializing in acupressure and Caribbean bush medicine', schedule: { thu: ['09:00-17:00'], fri: ['09:00-18:00'], sat: ['10:00-16:00'] } },
	]})

	// ─── Spa 11: Luxe Beauty & Nail Lounge (Luxury Nails & Keratin) ──────────
	const spa11 = await prisma.spa.create({
		data: {
			ownerId: owner2.id,
			name: 'Luxe Beauty & Nail Lounge',
			slug: 'luxe-retreat',
			description: 'High-end beauty and nail lounge specializing in luxury crystal nails, keratin treatments, and premium hair coloring.',
			coverUrl: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=800&h=400&fit=crop&q=80',
			address: '369 Luxury Lane, Micoud, Saint Lucia',
			phone: '+1 758-555-1100',
			email: 'luxe@beautylounge.com',
			colorPrimary: '#D4AF37',
			businessHours: { mon: ['09:00-20:00'], tue: ['09:00-20:00'], wed: ['09:00-20:00'], thu: ['09:00-20:00'], fri: ['09:00-21:00'], sat: ['10:00-21:00'], sun: ['11:00-19:00'] },
		},
	})
	const luxeNail11 = await prisma.service.create({ data: { spaId: spa11.id, name: 'Luxury Nails', description: 'Premium gel, acrylic and crystal nail services.' } })
	const luxeHair11 = await prisma.service.create({ data: { spaId: spa11.id, name: 'Hair Treatments', description: 'Keratin, coloring and premium hair care.' } })
	await prisma.subservice.createMany({ data: [
		{ spaId: spa11.id, serviceId: luxeNail11.id, name: 'Premium Gel with Crystals', description: 'Luxury gel manicure adorned with Swarovski crystals', durationMin: 60, priceCents: 12000 },
		{ spaId: spa11.id, serviceId: luxeNail11.id, name: 'Acrylic Extensions', description: 'Full set of sculpted acrylic nail extensions with gel topcoat', durationMin: 75, priceCents: 10500 },
		{ spaId: spa11.id, serviceId: luxeNail11.id, name: 'Luxury Spa Pedicure', description: 'Premium pedicure with gold mask and callus treatment', durationMin: 60, priceCents: 9500 },
		{ spaId: spa11.id, serviceId: luxeHair11.id, name: 'Keratin Treatment', description: 'Professional Brazilian keratin smoothing for frizz-free hair', durationMin: 120, priceCents: 18000 },
		{ spaId: spa11.id, serviceId: luxeHair11.id, name: 'Luxury Hair Coloring', description: 'Full color with Olaplex bond repair treatment included', durationMin: 120, priceCents: 17000 },
	]})
	await prisma.employee.createMany({ data: [
		{ spaId: spa11.id, name: 'Isabelle Marquis', bio: 'Luxury nail technician specializing in crystal embellishments and sculpted acrylics', schedule: { mon: ['09:00-20:00'], tue: ['09:00-20:00'], wed: ['09:00-20:00'] } },
		{ spaId: spa11.id, name: 'Dominique Charles', bio: 'Senior hair stylist and keratin treatment expert with training in Paris and New York', schedule: { thu: ['09:00-20:00'], fri: ['09:00-21:00'], sat: ['10:00-21:00'] } },
		{ spaId: spa11.id, name: 'Simone Bélizaire', bio: 'Certified nail artist and pedicure specialist focused on luxury hand and foot care', schedule: { wed: ['09:00-20:00'], fri: ['09:00-21:00'], sun: ['11:00-19:00'] } },
	]})

	// ─── Spa 12: Pure Nature Spa (Organic & Eco Treatments) ──────────────────
	const spa12 = await prisma.spa.create({
		data: {
			ownerId: owner3.id,
			name: 'Pure Nature Spa',
			slug: 'pure-nature',
			description: 'Eco-friendly spa using only certified organic products, offering coconut oil massages, bamboo therapy, and green body wraps.',
			coverUrl: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800&h=400&fit=crop&q=80',
			address: '147 Forest Road, Babonneau, Saint Lucia',
			phone: '+1 758-555-1200',
			email: 'sustainable@purenature.com',
			colorPrimary: '#84CC16',
			businessHours: { mon: ['10:00-18:00'], tue: ['10:00-18:00'], wed: ['10:00-18:00'], thu: ['10:00-18:00'], fri: ['10:00-19:00'], sat: ['09:00-17:00'], sun: ['10:00-16:00'] },
		},
	})
	const organicService12 = await prisma.service.create({ data: { spaId: spa12.id, name: 'Organic Treatments', description: 'Natural and sustainable spa therapies.' } })
	await prisma.subservice.createMany({ data: [
		{ spaId: spa12.id, serviceId: organicService12.id, name: 'Coconut Oil Massage', description: 'Therapeutic massage using pure cold-pressed coconut oil', durationMin: 60, priceCents: 11000 },
		{ spaId: spa12.id, serviceId: organicService12.id, name: 'Bamboo Massage', description: 'Heated bamboo stick massage for deep muscle relaxation', durationMin: 75, priceCents: 13500 },
		{ spaId: spa12.id, serviceId: organicService12.id, name: 'Green Tea Body Wrap', description: 'Antioxidant-rich green tea body mask and wrap treatment', durationMin: 60, priceCents: 12000 },
	]})
	await prisma.employee.createMany({ data: [
		{ spaId: spa12.id, name: 'Renée Laforce', bio: 'Organic skincare specialist and certified aromatherapist passionate about sustainable wellness', schedule: { mon: ['10:00-18:00'], wed: ['10:00-18:00'], fri: ['10:00-19:00'] } },
		{ spaId: spa12.id, name: 'Samuel Fevrier', bio: 'Trained in bamboo massage and natural body wrap techniques using locally sourced ingredients', schedule: { tue: ['10:00-18:00'], thu: ['10:00-18:00'], sat: ['09:00-17:00'] } },
	]})

	// ─── Spa 13: Serenity Springs (Volcanic Hot Spring & Mud) ────────────────
	const spa13 = await prisma.spa.create({
		data: {
			ownerId: owner1.id,
			name: 'Serenity Springs',
			slug: 'serenity-springs',
			description: 'Volcanic hot spring resort offering geothermal mineral baths, volcanic mud wraps, and thermal wellness rituals.',
			coverUrl: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=800&h=400&fit=crop&q=80',
			address: '555 Spring Crest, Mabouya Valley, Saint Lucia',
			phone: '+1 758-555-1300',
			email: 'springs@serenityresort.com',
			colorPrimary: '#F97316',
			businessHours: { mon: ['08:00-20:00'], tue: ['08:00-20:00'], wed: ['08:00-20:00'], thu: ['08:00-20:00'], fri: ['08:00-21:00'], sat: ['08:00-21:00'], sun: ['09:00-19:00'] },
		},
	})
	const springService13 = await prisma.service.create({ data: { spaId: spa13.id, name: 'Thermal Treatments', description: 'Geothermal hot spring and volcanic mud therapies.' } })
	await prisma.subservice.createMany({ data: [
		{ spaId: spa13.id, serviceId: springService13.id, name: 'Natural Hot Spring Bath', description: 'Mineral-rich volcanic hot spring soak for full body rejuvenation', durationMin: 45, priceCents: 9500 },
		{ spaId: spa13.id, serviceId: springService13.id, name: 'Volcanic Mud Wrap', description: 'Therapeutic mineral-rich volcanic mud applied and wrapped full body', durationMin: 75, priceCents: 12000 },
		{ spaId: spa13.id, serviceId: springService13.id, name: 'Hot Spring & Massage Ritual', description: 'Hot spring soak followed by a warm stone massage', durationMin: 105, priceCents: 18500 },
	]})
	await prisma.employee.createMany({ data: [
		{ spaId: spa13.id, name: 'Claude Renard', bio: 'Geothermal wellness therapist specializing in volcanic mud and thermal bath treatments', schedule: { mon: ['08:00-20:00'], wed: ['08:00-20:00'], fri: ['08:00-21:00'] } },
		{ spaId: spa13.id, name: 'Marissa Volcan', bio: 'Certified hydrotherapy and thermal spa specialist with 9 years at volcanic resort spas', schedule: { tue: ['08:00-20:00'], thu: ['08:00-20:00'], sat: ['08:00-21:00'] } },
	]})

	// ─── Spa 14: Zenith Modern Beauty Studio (Hair, Locs & Lashes) ───────────
	const spa14 = await prisma.spa.create({
		data: {
			ownerId: owner2.id,
			name: 'Zenith Modern Beauty Studio',
			slug: 'zenith-wellness',
			description: 'Trendy modern beauty studio specializing in balayage, loc styling, HD brows, and lash extensions.',
			coverUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=400&fit=crop&q=80',
			address: '789 Tech Boulevard, Castries, Saint Lucia',
			phone: '+1 758-555-1400',
			email: 'hello@zenithbeauty.com',
			colorPrimary: '#06B6D4',
			businessHours: { mon: ['07:00-20:00'], tue: ['07:00-20:00'], wed: ['07:00-20:00'], thu: ['07:00-20:00'], fri: ['07:00-21:00'], sat: ['08:00-19:00'], sun: ['09:00-18:00'] },
		},
	})
	const hairService14 = await prisma.service.create({ data: { spaId: spa14.id, name: 'Hair Services', description: 'Modern cutting, coloring, balayage and loc styling.' } })
	const beautyService14 = await prisma.service.create({ data: { spaId: spa14.id, name: 'Brow & Lash Services', description: 'HD brows, lash lifts and extensions.' } })
	await prisma.subservice.createMany({ data: [
		{ spaId: spa14.id, serviceId: hairService14.id, name: 'Modern Haircut & Style', description: 'Precision cut with blow-dry and styling finish', durationMin: 45, priceCents: 6000 },
		{ spaId: spa14.id, serviceId: hairService14.id, name: 'Ombre & Balayage', description: 'Sun-kissed hair coloring with seamless blending technique', durationMin: 120, priceCents: 16000 },
		{ spaId: spa14.id, serviceId: hairService14.id, name: 'Loc Retwist & Styling', description: 'Professional loc maintenance, retwist and creative styling', durationMin: 90, priceCents: 9000 },
		{ spaId: spa14.id, serviceId: beautyService14.id, name: 'HD Brows', description: 'High-definition eyebrow design, tinting and shaping', durationMin: 30, priceCents: 4500 },
		{ spaId: spa14.id, serviceId: beautyService14.id, name: 'Classic Lash Extensions', description: 'Individual lash extensions for a natural, voluminous look', durationMin: 90, priceCents: 11000 },
		{ spaId: spa14.id, serviceId: beautyService14.id, name: 'Lash Lift & Tint', description: 'Lifting and darkening of natural lashes for a no-mascara look', durationMin: 60, priceCents: 7500 },
	]})
	await prisma.employee.createMany({ data: [
		{ spaId: spa14.id, name: 'Jasmine Felix', bio: 'Award-winning hair stylist specializing in balayage, color corrections and modern cuts', schedule: { mon: ['07:00-20:00'], tue: ['07:00-20:00'], wed: ['07:00-20:00'] } },
		{ spaId: spa14.id, name: 'Nadia Prophète', bio: 'Certified lash technician and HD brow artist with training in London and Miami', schedule: { thu: ['07:00-20:00'], fri: ['07:00-21:00'], sat: ['08:00-19:00'] } },
		{ spaId: spa14.id, name: 'Christelle Morin', bio: 'Loc specialist and natural hair expert with expertise in protective styling', schedule: { wed: ['07:00-20:00'], fri: ['07:00-21:00'], sun: ['09:00-18:00'] } },
	]})

	// ─── Spa 15: Island Paradise Spa (Caribbean Rituals) ─────────────────────
	const spa15 = await prisma.spa.create({
		data: {
			ownerId: owner3.id,
			name: 'Island Paradise Spa',
			slug: 'island-paradise',
			description: 'Tropical beachfront escape offering authentic Caribbean rituals using local herbs, tropical fruits, and Saint Lucia cocoa.',
			coverUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=400&fit=crop&q=80',
			address: '999 Paradise Beach, Soufrière, Saint Lucia',
			phone: '+1 758-555-1500',
			email: 'paradise@tropicspa.com',
			colorPrimary: '#EC4899',
			businessHours: { mon: ['09:00-19:00'], tue: ['09:00-19:00'], wed: ['09:00-19:00'], thu: ['09:00-19:00'], fri: ['09:00-20:00'], sat: ['10:00-20:00'], sun: ['11:00-18:00'] },
		},
	})
	const islandService15 = await prisma.service.create({ data: { spaId: spa15.id, name: 'Caribbean Treatments', description: 'Authentic island-inspired wellness rituals.' } })
	await prisma.subservice.createMany({ data: [
		{ spaId: spa15.id, serviceId: islandService15.id, name: 'Plantation Massage', description: 'Warm Caribbean herbal compress massage using local medicinal plants', durationMin: 75, priceCents: 14000 },
		{ spaId: spa15.id, serviceId: islandService15.id, name: 'Tropical Body Polish', description: 'Papaya, mango and sugar cane full-body exfoliation treatment', durationMin: 60, priceCents: 11500 },
		{ spaId: spa15.id, serviceId: islandService15.id, name: 'Rum & Cocoa Body Wrap', description: 'Detoxifying Saint Lucia cocoa and rum body mask experience', durationMin: 75, priceCents: 13000 },
	]})
	await prisma.employee.createMany({ data: [
		{ spaId: spa15.id, name: 'Odette Augustin', bio: 'Caribbean wellness therapist with deep knowledge of local healing plants and island rituals', schedule: { mon: ['09:00-19:00'], wed: ['09:00-19:00'], fri: ['09:00-20:00'] } },
		{ spaId: spa15.id, name: 'Theo Deterville', bio: 'Trained in traditional Saint Lucian massage and authentic Caribbean body treatment techniques', schedule: { tue: ['09:00-19:00'], thu: ['09:00-19:00'], sat: ['10:00-20:00'] } },
	]})

	const legacySpas = await prisma.spa.findMany()
	for (const spa of legacySpas) {
		const business = await prisma.business.create({ data: { name: spa.name, slug: spa.slug, status: 'SETUP', legacySpaId: spa.id } })
		const location = await prisma.location.create({ data: { businessId: business.id, name: spa.name, slug: 'main', address: spa.address, phone: spa.phone, email: spa.email, businessHours: spa.businessHours } })
		const ownerMembership = await prisma.businessMembership.create({ data: { businessId: business.id, userId: spa.ownerId, role: 'OWNER' } })
		await prisma.locationAssignment.create({ data: { membershipId: ownerMembership.id, locationId: location.id } })
		await prisma.businessSetup.create({ data: { businessId: business.id, profileComplete: true, firstLocationComplete: true } })
		if (spa.id === spa1.id) {
			for (const [userId, role] of [[manager.id, 'MANAGER'], [accountant.id, 'ACCOUNTS'], [staff.id, 'STAFF']] as const) {
				const membership = await prisma.businessMembership.create({ data: { businessId: business.id, userId, role } })
				await prisma.locationAssignment.create({ data: { membershipId: membership.id, locationId: location.id } })
			}
		}
	}

	console.log('✅ Seeded successfully!')
	console.log('\n📊 Summary:')
	console.log(`- 4 Users (3 spa owners, 1 customer)`)
	console.log(`- 15 Spas with matching services and staff`)
	console.log(`\n🔑 Login credentials:`)
	console.log(`  Customer: customer@example.com / password123`)
	console.log(`  Spa Owner: owner@example.com / password123`)
	console.log(`  Manager: manager@example.com / password123`)
	console.log(`  Accounts: accountant@example.com / password123`)
	console.log(`  Staff: staff@example.com / password123`)
}

main()
	.catch((e) => { console.error(e); process.exit(1) })
	.finally(async () => { await prisma.$disconnect() })
