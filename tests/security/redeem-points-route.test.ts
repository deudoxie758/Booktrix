import { describe, expect, it } from 'vitest'

import { POST } from '@/app/api/redeemPoints/route'

describe('standalone point redemption', () => {
  it('is retired so points cannot be consumed outside a successful booking transaction', async () => {
    const response = await POST()
    expect(response.status).toBe(410)
  })
})
