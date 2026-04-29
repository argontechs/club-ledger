import { describe, it, expect, vi, beforeEach } from 'vitest'

// The mocked db.select(...).from(...).innerJoin(...).where() result is whatever
// the test puts in `nextResult`. Tests set this before calling the function under
// test to simulate "owner is linked to this ambassador" vs "no owner link".
const mockState: { nextResult: unknown[] } = { nextResult: [] }

vi.mock('~~/server/db/client', () => {
  const useDB = () => ({
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => mockState.nextResult,
        }),
      }),
    }),
  })
  return {
    useDB,
    schema: {
      users: { ambassadorId: { name: 'ambassador_id' }, roleId: { name: 'role_id' } },
      roles: { id: { name: 'id' }, name: { name: 'name' } },
    },
  }
})

import { isOwnerProtectedAmbassador, assertNotOwnerProtected } from '~~/server/utils/permissions'

beforeEach(() => { mockState.nextResult = [] })

describe('isOwnerProtectedAmbassador', () => {
  it('returns true when an owner user links to that ambassador', async () => {
    mockState.nextResult = [{ ambassadorId: 7 }]
    expect(await isOwnerProtectedAmbassador(7)).toBe(true)
  })
  it('returns false otherwise', async () => {
    mockState.nextResult = []
    expect(await isOwnerProtectedAmbassador(99)).toBe(false)
  })
})

describe('assertNotOwnerProtected', () => {
  it('throws for admin actor on owner-protected user', async () => {
    await expect(
      assertNotOwnerProtected({ id: 1, roleName: 'admin' }, { kind: 'user', targetRoleName: 'owner' }),
    ).rejects.toThrow()
  })

  it('allows owner actor on anything', async () => {
    await expect(
      assertNotOwnerProtected({ id: 1, roleName: 'owner' }, { kind: 'user', targetRoleName: 'owner' }),
    ).resolves.toBeUndefined()
  })

  it('allows admin on non-owner targets (user kind)', async () => {
    await expect(
      assertNotOwnerProtected({ id: 1, roleName: 'admin' }, { kind: 'user', targetRoleName: 'leader' }),
    ).resolves.toBeUndefined()
  })

  it('throws for admin actor on owner-linked ambassador', async () => {
    mockState.nextResult = [{ ambassadorId: 7 }]
    await expect(
      assertNotOwnerProtected({ id: 1, roleName: 'admin' }, { kind: 'ambassador', ambassadorId: 7 }),
    ).rejects.toThrow()
  })

  it('allows admin actor on a non-owner-linked ambassador', async () => {
    mockState.nextResult = []
    await expect(
      assertNotOwnerProtected({ id: 1, roleName: 'admin' }, { kind: 'ambassador', ambassadorId: 42 }),
    ).resolves.toBeUndefined()
  })

  it('throws for admin actor on owner-linked sale', async () => {
    mockState.nextResult = [{ ambassadorId: 7 }]
    await expect(
      assertNotOwnerProtected({ id: 1, roleName: 'admin' }, { kind: 'sale', ambassadorId: 7 }),
    ).rejects.toThrow()
  })

  it('throws for admin actor on owner-linked payout', async () => {
    mockState.nextResult = [{ ambassadorId: 7 }]
    await expect(
      assertNotOwnerProtected({ id: 1, roleName: 'admin' }, { kind: 'payout', ambassadorId: 7 }),
    ).rejects.toThrow()
  })
})
