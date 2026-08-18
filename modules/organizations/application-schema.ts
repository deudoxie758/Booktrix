import { z } from 'zod'

export const businessApplicationSchema = z.object({
	businessName: z.string().trim().min(2).max(120),
	ownerName: z.string().trim().min(2).max(120),
	email: z.string().trim().toLowerCase().email(),
	phone: z.string().trim().min(7).max(30),
	address: z.string().trim().min(5).max(240),
	industry: z.string().trim().min(2).max(100),
	serviceSummary: z.string().trim().min(20).max(2000),
	termsAccepted: z.literal(true),
})

export type BusinessApplicationInput = z.infer<typeof businessApplicationSchema>
