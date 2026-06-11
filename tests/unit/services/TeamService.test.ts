import { describe, it, expect, vi } from 'vitest'

vi.mock('~~/server/repositories/TeamRepository', () => ({
  TeamRepo: {
    list: vi.fn(async () => []),
    findById: vi.fn(async () => ({ id: 1, name: 'T' })),
    insert: vi.fn(async () => [{ insertId: 1 }]),
    update: vi.fn(async () => undefined),
    softDelete: vi.fn(async () => undefined),
  },
}))

import { TeamService } from '~~/server/services/TeamService'

const nonAdmin = { id: 9, roleName: 'x', tier: 'ambassador' } as any
const admin = { id: 1, roleName: 'admin', tier: 'admin' } as any

describe('TeamService guards', () => {
  it('rejects non-admin on list/create/update/remove', async () => {
    await expect(TeamService.list(nonAdmin)).rejects.toMatchObject({ statusCode: 403 })
    await expect(TeamService.create(nonAdmin, { name: 'N' })).rejects.toMatchObject({ statusCode: 403 })
    await expect(TeamService.update(nonAdmin, 1, { name: 'N' })).rejects.toMatchObject({ statusCode: 403 })
    await expect(TeamService.remove(nonAdmin, 1)).rejects.toMatchObject({ statusCode: 403 })
  })
  it('admin passes through', async () => {
    await expect(TeamService.create(admin, { name: 'N' })).resolves.toBeTruthy()
  })
})
