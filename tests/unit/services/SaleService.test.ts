import { describe, it, expect, vi, beforeEach } from 'vitest'

const sale = {
  id: 1, status: 'draft', amount: '1000.00', date: '2026-04-01',
  ambassadorId: 5, type: 'Table',
  confirmedCommissionRate: null, confirmedBonusRate: null,
} as any

vi.mock('~~/server/repositories/SaleRepository', () => ({
  SaleRepo: {
    findById: vi.fn(async (id: number) => (id === 1 ? sale : undefined)),
    update: vi.fn(async () => undefined),
    insert: vi.fn(async () => [{ insertId: 99 }]),
  },
}))
vi.mock('~~/server/repositories/AmbassadorRepository', () => ({
  AmbassadorRepo: { findById: vi.fn(async () => ({ id: 5, commissionRate: '8.00', deletedAt: null })) },
}))
vi.mock('~~/server/services/SettingsService', () => ({
  SettingsService: { get: vi.fn(async (k: string) => (k === 'bonus_rate' ? '1.00' : '8.00')) },
}))
vi.mock('~~/server/utils/permissions', () => ({
  assertNotOwnerProtected: vi.fn(async () => undefined),
}))

import { SaleService } from '~~/server/services/SaleService'
import { SaleRepo } from '~~/server/repositories/SaleRepository'

describe('SaleService.confirm', () => {
  beforeEach(() => { sale.status = 'draft'; sale.confirmedCommissionRate = null; sale.confirmedBonusRate = null })

  it('freezes commission and bonus rate on confirm', async () => {
    await SaleService.confirm({ id: 9, roleName: 'admin' } as any, 1)
    expect(SaleRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({
      status: 'confirmed',
      confirmedCommissionRate: '8.00',
      confirmedBonusRate: '1.00',
    }))
  })

  it('refuses to confirm an already-confirmed sale', async () => {
    sale.status = 'confirmed'
    await expect(SaleService.confirm({ id: 9, roleName: 'admin' } as any, 1)).rejects.toThrow()
  })
})
