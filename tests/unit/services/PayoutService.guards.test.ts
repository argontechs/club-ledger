import { describe, it, expect, vi } from 'vitest'

vi.mock('~~/server/repositories/PayoutRepository', () => ({
  PayoutRepo: {
    findById: vi.fn(async (id: number) => ({ id, ambassadorId: 5, clubId: 1, receiptPaths: [], payslipPath: null })),
    update: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
    list: vi.fn(async () => []),
  },
}))
vi.mock('~~/server/utils/permissions', () => ({
  assertNotOwnerProtected: vi.fn(async () => undefined),
}))

import { PayoutService } from '~~/server/services/PayoutService'

const nonAdmin = { id: 9, roleName: 'x', tier: 'ambassador' } as any

const admin = { id: 1, roleName: 'admin', tier: 'admin' } as any

describe('PayoutService mutation guards', () => {
  it('rejects non-admin tier on markPaid / markUnpaid / remove', async () => {
    await expect(PayoutService.markPaid(nonAdmin, 1, 1)).rejects.toMatchObject({ statusCode: 403 })
    await expect(PayoutService.markUnpaid(nonAdmin, 1, 1)).rejects.toMatchObject({ statusCode: 403 })
    await expect(PayoutService.remove(nonAdmin, 1, 1)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('rejects non-admin tier on receipt upload/delete', async () => {
    await expect(
      PayoutService.addReceipt(nonAdmin, 1, 1, { name: 'r.pdf', mime: 'application/pdf', data: Buffer.from('x') }),
    ).rejects.toMatchObject({ statusCode: 403 })
    await expect(PayoutService.deleteReceipt(nonAdmin, 1, 1, 0)).rejects.toMatchObject({ statusCode: 403 })
  })

  it('treats payouts from another club as missing (404)', async () => {
    await expect(PayoutService.markPaid(admin, 2, 1)).rejects.toMatchObject({ statusCode: 404 })
    await expect(PayoutService.getReceipt(admin, 2, 1, 0)).rejects.toMatchObject({ statusCode: 404 })
  })
})
