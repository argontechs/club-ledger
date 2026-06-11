import { describe, it, expect, vi, beforeEach } from 'vitest'

const inserted: any[] = []
const role = { id: 7, name: 'VIP', tier: 'ambassador', baseRate: '9.50', bonusRate: '1.25' }

vi.mock('~~/server/repositories/SaleRepository', () => ({
  SaleRepo: {
    findByExternalOrderIds: vi.fn(async (_clubId: number, _ids: string[]) => []),
    insertMany: vi.fn(async (rows: any[]) => { inserted.push(...rows) }),
  },
}))
vi.mock('~~/server/repositories/AmbassadorRepository', () => ({
  AmbassadorRepo: { findById: vi.fn(async (id: number) => ({ id, roleId: 7, clubId: 1, deletedAt: null })) },
}))
vi.mock('~~/server/repositories/RoleRepository', () => ({
  RoleRepo: { findById: vi.fn(async (id: number) => (id === 7 ? role : undefined)) },
}))
vi.mock('~~/server/repositories/SaleTypeRepository', () => ({
  SaleTypeRepo: {
    listByClub: vi.fn(async () => [
      { id: 1, clubId: 1, name: 'Table', sortOrder: 0, isActive: 1 },
      { id: 2, clubId: 1, name: 'BGO', sortOrder: 1, isActive: 1 },
    ]),
  },
}))
vi.mock('~~/server/utils/permissions', async () => {
  const { can } = await import('~~/shared/permissions')
  return {
    assertNotOwnerProtected: vi.fn(async () => undefined),
    assertCan: (actor: any, module: any, level: any) => {
      if (!can(actor, module, level)) {
        throw Object.assign(new Error('Insufficient permissions'), { statusCode: 403 })
      }
    },
  }
})

import { PDFImportService } from '~~/server/services/PDFImportService'

const admin = { id: 1, roleName: 'admin', tier: 'admin' } as any
const row = { date: '2026-04-02', externalOrderId: 'T260402000000001', tableNumber: 'L1', amount: 1000, ambassadorId: 5 }

beforeEach(() => { inserted.length = 0 })

describe('PDFImportService.commit', () => {
  it('freezes rates from the ambassador role when importing as confirmed', async () => {
    await PDFImportService.commit(admin, 1, { status: 'confirmed', rows: [row] })
    expect(inserted).toHaveLength(1)
    expect(inserted[0].confirmedCommissionRate).toBe('9.50')
    expect(inserted[0].confirmedBonusRate).toBe('1.25')
    expect(inserted[0].confirmedAt).toBeInstanceOf(Date)
    expect(inserted[0].clubId).toBe(1)
  })

  it('leaves rates null when importing as draft', async () => {
    await PDFImportService.commit(admin, 1, { status: 'draft', rows: [row] })
    expect(inserted[0].confirmedCommissionRate).toBeNull()
    expect(inserted[0].confirmedBonusRate).toBeNull()
    expect(inserted[0].confirmedAt).toBeNull()
  })

  it('rejects ambassadors from a different club', async () => {
    await expect(
      PDFImportService.commit(admin, 2, { status: 'draft', rows: [row] }),
    ).rejects.toMatchObject({ statusCode: 422 })
  })

  it('rejects non-admin-tier actors', async () => {
    await expect(
      PDFImportService.commit({ id: 2, roleName: 'whatever', tier: 'ambassador' } as any, 1, { status: 'draft', rows: [row] }),
    ).rejects.toMatchObject({ statusCode: 403 })
  })
})
