import { describe, it, expect } from 'vitest'
import { can, permissionLevel, defaultPermissions } from '~~/shared/permissions'

describe('shared permission evaluation', () => {
  it('owners always have edit everywhere, overrides ignored', () => {
    const owner = { tier: 'admin', isOwner: 1, permissions: { payouts: 'none' as const } }
    expect(can(owner, 'payouts', 'edit')).toBe(true)
    expect(can(owner, 'clubs', 'edit')).toBe(true)
  })

  it('admin tier defaults to edit on management modules', () => {
    const admin = { tier: 'admin', isOwner: 0, permissions: null }
    expect(can(admin, 'sales', 'edit')).toBe(true)
    expect(can(admin, 'payouts', 'edit')).toBe(true)
    expect(can(admin, 'commissions', 'view')).toBe(true)
    expect(can(admin, 'commissions', 'edit')).toBe(false)
  })

  it('ambassador tier defaults mirror the read-only workspace', () => {
    const amb = { tier: 'ambassador', isOwner: 0, permissions: null }
    expect(can(amb, 'sales', 'view')).toBe(true)
    expect(can(amb, 'sales', 'edit')).toBe(false)
    expect(can(amb, 'payouts', 'view')).toBe(false)
    expect(can(amb, 'roles', 'view')).toBe(false)
  })

  it('owner overrides downgrade and upgrade per module', () => {
    const restricted = { tier: 'admin', isOwner: 0, permissions: { payouts: 'view' as const, roles: 'none' as const } }
    expect(can(restricted, 'payouts', 'view')).toBe(true)
    expect(can(restricted, 'payouts', 'edit')).toBe(false)
    expect(can(restricted, 'roles', 'view')).toBe(false)
    // untouched modules keep tier defaults
    expect(can(restricted, 'sales', 'edit')).toBe(true)

    const upgraded = { tier: 'ambassador', isOwner: 0, permissions: { payouts: 'edit' as const } }
    expect(can(upgraded, 'payouts', 'edit')).toBe(true)
  })

  it('permissionLevel resolves the same values can() consumes', () => {
    expect(permissionLevel({ tier: 'admin', isOwner: 0 }, 'settings')).toBe('edit')
    expect(defaultPermissions('ambassador').import).toBe('none')
  })
})
