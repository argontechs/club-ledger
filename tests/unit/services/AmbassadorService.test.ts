import { describe, it, expect, vi } from 'vitest'

const fullRow = {
  id: 5, name: 'Sasha', fullName: 'Sasha W.', ic: '900101-14-5566', teamId: 2, roleId: 3,
  isProtected: 0, bankName: 'Maybank', bankAccountNumber: '1234567890', bankOwnerName: 'Sasha W.',
  createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
}
vi.mock('~~/server/repositories/AmbassadorRepository', () => ({
  AmbassadorRepo: {
    list: vi.fn(async () => [fullRow]),
    findById: vi.fn(async () => fullRow),
  },
}))
vi.mock('~~/server/repositories/RoleRepository', () => ({
  RoleRepo: { findById: vi.fn(async () => ({ id: 3 })) },
}))
vi.mock('~~/server/utils/permissions', () => ({
  assertNotOwnerProtected: vi.fn(async () => undefined),
}))

import { AmbassadorService } from '~~/server/services/AmbassadorService'

describe('Ambassador PII field filtering', () => {
  it('admin tier sees all columns', async () => {
    const rows = await AmbassadorService.list({ id: 1, roleName: 'admin', tier: 'admin' } as any, {})
    expect(rows[0].bankAccountNumber).toBe('1234567890')
    expect(rows[0].ic).toBe('900101-14-5566')
  })
  it('non-admin tier gets only id/name/teamId/roleId', async () => {
    const rows = await AmbassadorService.list({ id: 9, roleName: 'x', tier: 'ambassador' } as any, {})
    expect(rows[0]).toEqual({ id: 5, name: 'Sasha', teamId: 2, roleId: 3 })
  })
  it('get applies the same filter for non-admin', async () => {
    const a = await AmbassadorService.get(5, { id: 9, roleName: 'x', tier: 'ambassador' } as any)
    expect((a as any).ic).toBeUndefined()
    expect((a as any).name).toBe('Sasha')
  })
})
