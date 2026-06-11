// Single source of truth for module permissions — imported by BOTH the
// server guards and the frontend (Nuxt shared/ directory).
//
// Model: the staff role's `tier` supplies the DEFAULTS; the owner can
// override per user with { [module]: 'edit' | 'view' | 'none' } stored in
// users.permissions. Owners always have full access and cannot be restricted.

export type PermissionLevel = 'edit' | 'view' | 'none'

export const PERMISSION_MODULES = [
  'dashboard',
  'sales',
  'import',
  'commissions',
  'payouts',
  'leaderboard',
  'ambassadors',
  'teams',
  'roles',
  'settings',
  'clubs',
] as const

export type PermissionModule = typeof PERMISSION_MODULES[number]

export const MODULE_LABELS: Record<PermissionModule, string> = {
  dashboard: 'Dashboard',
  sales: 'Sales',
  import: 'PDF import',
  commissions: 'Commissions',
  payouts: 'Payouts',
  leaderboard: 'Leaderboard',
  ambassadors: 'Ambassadors',
  teams: 'Teams',
  roles: 'Roles',
  settings: 'Settings',
  clubs: 'Club management',
}

const ADMIN_DEFAULTS: Record<PermissionModule, PermissionLevel> = {
  dashboard: 'view', sales: 'edit', import: 'edit', commissions: 'view',
  payouts: 'edit', leaderboard: 'view', ambassadors: 'edit', teams: 'edit',
  roles: 'edit', settings: 'edit', clubs: 'edit',
}

// Mirrors what ambassador-tier logins could already reach before the matrix
// existed: the read-only workspace pages, none of the management surface.
const AMBASSADOR_DEFAULTS: Record<PermissionModule, PermissionLevel> = {
  dashboard: 'view', sales: 'view', import: 'none', commissions: 'view',
  payouts: 'none', leaderboard: 'view', ambassadors: 'none', teams: 'none',
  roles: 'none', settings: 'none', clubs: 'none',
}

export interface PermissionActor {
  tier?: string
  isOwner?: number | boolean
  permissions?: Record<string, PermissionLevel> | null
}

export function defaultPermissions(tier: string | undefined): Record<PermissionModule, PermissionLevel> {
  return tier === 'admin' ? { ...ADMIN_DEFAULTS } : { ...AMBASSADOR_DEFAULTS }
}

/** Effective level for one module, after owner overrides. */
export function permissionLevel(actor: PermissionActor, module: PermissionModule): PermissionLevel {
  if (actor.isOwner) return 'edit'
  const override = actor.permissions?.[module]
  if (override === 'edit' || override === 'view' || override === 'none') return override
  return defaultPermissions(actor.tier)[module]
}

export function can(actor: PermissionActor, module: PermissionModule, level: 'view' | 'edit'): boolean {
  const have = permissionLevel(actor, module)
  if (have === 'none') return false
  if (level === 'edit') return have === 'edit'
  return true
}
