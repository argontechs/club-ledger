import { describe, it, expect, vi, beforeEach } from 'vitest'

const sale = {
  id: 1, status: 'draft', amount: '1000.00', date: '2026-04-01',
  ambassadorId: 5, clubId: 1, type: 'Table',
  confirmedCommissionRate: null, confirmedBonusRate: null,
} as any

const role = { id: 7, name: 'Ambassador', tier: 'ambassador', baseRate: '8.00', bonusRate: '1.00' }

vi.mock('~~/server/repositories/SaleRepository', () => ({
  SaleRepo: {
    findById: vi.fn(async (id: number) => (id === 1 ? sale : undefined)),
    update: vi.fn(async () => undefined),
    insert: vi.fn(async () => [{ insertId: 99 }]),
  },
}))
vi.mock('~~/server/repositories/AmbassadorRepository', () => ({
  AmbassadorRepo: { findById: vi.fn(async () => ({ id: 5, roleId: 7, deletedAt: null })) },
}))
vi.mock('~~/server/db/client', () => ({
  useDB: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [role],
        }),
      }),
    }),
  }),
  schema: { roles: { id: 'id' } },
}))
vi.mock('~~/server/utils/permissions', () => ({
  assertNotOwnerProtected: vi.fn(async () => undefined),
}))

import { SaleService } from '~~/server/services/SaleService'
import { SaleRepo } from '~~/server/repositories/SaleRepository'

describe('SaleService.confirm', () => {
  beforeEach(() => { sale.status = 'draft'; sale.confirmedCommissionRate = null; sale.confirmedBonusRate = null })

  it('freezes commission and bonus rate from ambassador role on confirm', async () => {
    await SaleService.confirm({ id: 9, roleName: 'admin', tier: 'admin' } as any, 1, 1)
    expect(SaleRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({
      status: 'confirmed',
      confirmedCommissionRate: '8.00',
      confirmedBonusRate: '1.00',
    }))
  })

  it('refuses to confirm an already-confirmed sale', async () => {
    sale.status = 'confirmed'
    await expect(SaleService.confirm({ id: 9, roleName: 'admin', tier: 'admin' } as any, 1, 1)).rejects.toThrow()
  })

  it('treats sales from another club as missing (404)', async () => {
    await expect(SaleService.confirm({ id: 9, roleName: 'admin', tier: 'admin' } as any, 2, 1))
      .rejects.toMatchObject({ statusCode: 404 })
  })
})
