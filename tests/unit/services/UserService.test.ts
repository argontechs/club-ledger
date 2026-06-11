import { describe, it, expect, vi } from 'vitest'

const mockState: { roleRow: any } = { roleRow: { id: 2, name: 'owner' } }
vi.mock('~~/server/db/client', () => ({
  useDB: () => ({
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => [mockState.roleRow] }),
        innerJoin: () => ({ where: () => ({ limit: async () => [mockState.roleRow] }) }),
      }),
    }),
    insert: () => ({ values: async () => [{ insertId: 1 }] }),
  }),
  schema: { users: {}, roles: {} },
}))
vi.mock('~~/server/utils/permissions', () => ({
  assertNotOwnerProtected: vi.fn(async () => undefined),
}))
vi.mock('~~/server/utils/password', () => ({ hashPassword: async () => 'hash' }))

import { UserService } from '~~/server/services/UserService'

const body = { email: 'a@b.co', password: 'secret1', name: 'A', roleId: 2 }

describe('UserService guards', () => {
  it('rejects non-admin tier on list', async () => {
    await expect(UserService.list({ id: 9, roleName: 'x', tier: 'ambassador' } as any))
      .rejects.toMatchObject({ statusCode: 403 })
  })
  it('rejects non-admin tier on create', async () => {
    await expect(UserService.create({ id: 9, roleName: 'x', tier: 'ambassador' } as any, body))
      .rejects.toMatchObject({ statusCode: 403 })
  })
  it('only an owner can create an owner — admin blocked', async () => {
    await expect(UserService.create({ id: 9, roleName: 'admin', tier: 'admin' } as any, body))
      .rejects.toMatchObject({ statusCode: 403 })
  })
  it('only an owner can create an owner — any other admin-tier roleName blocked too', async () => {
    await expect(UserService.create({ id: 9, roleName: 'director', tier: 'admin' } as any, body))
      .rejects.toMatchObject({ statusCode: 403 })
  })
})
