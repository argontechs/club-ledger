import { describe, it, expect, vi, beforeEach } from 'vitest'

// The mocked db.select(...).from(...).innerJoin(...).where() result is whatever
// the test puts in `nextResult`. Tests set this before calling the function under
// test to simulate "an owner is linked to this ambassador" vs "no owner link".
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
      roles: { id: { name: 'id' }, isOwner: { name: 'is_owner' } },
    },
  }
})

import { isOwnerProtectedAmbassador, assertNotOwnerProtected } from '~~/server/utils/permissions'

beforeEach(() => { mockState.nextResult = [] })

const ownerActor = { id: 1, roleName: 'whatever', isOwner: 1 }
const nonOwnerAdmin = { id: 2, roleName: 'renamed-admin', isOwner: 0 }

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

describe('assertNotOwnerProtected (flag-based — survives role renames)', () => {
  it('throws for non-owner actor on owner-flagged user target', async () => {
    await expect(
      assertNotOwnerProtected(nonOwnerAdmin, { kind: 'user', targetIsOwner: true }),
    ).rejects.toThrow()
  })

  it('allows owner actor on anything, regardless of role name', async () => {
    await expect(
      assertNotOwnerProtected(ownerActor, { kind: 'user', targetIsOwner: true }),
    ).resolves.toBeUndefined()
  })

  it('allows non-owner actors on non-owner targets', async () => {
    await expect(
      assertNotOwnerProtected(nonOwnerAdmin, { kind: 'user', targetIsOwner: false }),
    ).resolves.toBeUndefined()
  })

  it('throws for non-owner actor on owner-linked ambassador', async () => {
    mockState.nextResult = [{ ambassadorId: 7 }]
    await expect(
      assertNotOwnerProtected(nonOwnerAdmin, { kind: 'ambassador', ambassadorId: 7 }),
    ).rejects.toThrow()
  })

  it('allows non-owner actor on a non-owner-linked ambassador', async () => {
    mockState.nextResult = []
    await expect(
      assertNotOwnerProtected(nonOwnerAdmin, { kind: 'ambassador', ambassadorId: 42 }),
    ).resolves.toBeUndefined()
  })

  it('allows non-owner actor on owner-linked sale (day-to-day data entry)', async () => {
    mockState.nextResult = [{ ambassadorId: 7 }]
    await expect(
      assertNotOwnerProtected(nonOwnerAdmin, { kind: 'sale', ambassadorId: 7 }),
    ).resolves.toBeUndefined()
  })

  it('allows non-owner actor on owner-linked payout (day-to-day operations)', async () => {
    mockState.nextResult = [{ ambassadorId: 7 }]
    await expect(
      assertNotOwnerProtected(nonOwnerAdmin, { kind: 'payout', ambassadorId: 7 }),
    ).resolves.toBeUndefined()
  })
})
