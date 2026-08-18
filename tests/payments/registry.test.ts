import { describe, expect, it } from 'vitest'
import { getPaymentProvider } from '@/modules/payments/registry'

describe('payment provider registry', () => {
	it('rejects checkout when a provider is not configured', async () => {
		const provider = getPaymentProvider('unconfigured')
		await expect(provider.createCheckout({ amountCents: 5000, currency: 'XCD', reference: 'order-1', returnUrl: 'https://booktrix.test/return' }))
			.rejects.toMatchObject({ code: 'PAYMENT_PROVIDER_NOT_CONFIGURED' })
	})

	it('rejects invalid monetary requests before provider work', async () => {
		const provider = getPaymentProvider('unconfigured')
		await expect(provider.createCheckout({ amountCents: 0, currency: 'XCD', reference: 'order-1', returnUrl: 'https://booktrix.test/return' }))
			.rejects.toMatchObject({ code: 'INVALID_PAYMENT_REQUEST' })
	})
})
