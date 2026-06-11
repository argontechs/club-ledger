import { eq, and } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'
import { ApiError } from './errors'
import { can, type PermissionModule, type PermissionLevel } from '~~/shared/permissions'

export type Actor = {
  id: number
  roleName: string
  isOwner?: number | boolean
  tier?: string
  permissions?: Record<string, PermissionLevel> | null
  clubAccess?: number[] | null
}

/** Module-permission guard: tier supplies defaults, owner overrides per user. */
export function assertCan(actor: Actor, module: PermissionModule, level: 'view' | 'edit'): void {
  if (!can(actor as any, module, level)) {
    throw ApiError.forbidden('Insufficient permissions')
  }
}

export type ProtectionTarget =
  | { kind: 'user'; targetIsOwner: boolean }
  | { kind: 'ambassador'; ambassadorId: number }
  | { kind: 'sale'; ambassadorId: number }
  | { kind: 'payout'; ambassadorId: number }

export async function isOwnerProtectedAmbassador(ambassadorId: number): Promise<boolean> {
  const db = useDB()
  const rows = await db.select({ ambassadorId: schema.users.ambassadorId })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .where(and(eq(schema.roles.isOwner, 1), eq(schema.users.ambassadorId, ambassadorId)))
  return rows.length > 0
}

// Owner-protection keys on the role's is_owner flag, not its display name —
// renaming roles can never silently disable these guards. Owner actors are
// exempt; every other actor is constrained.
export async function assertNotOwnerProtected(actor: Actor, target: ProtectionTarget): Promise<void> {
  if (actor.isOwner) return
  switch (target.kind) {
    case 'user':
      if (target.targetIsOwner) throw ApiError.forbidden('owner-protected')
      return
    case 'ambassador':
      if (await isOwnerProtectedAmbassador(target.ambassadorId)) throw ApiError.forbidden('owner-protected')
      return
    case 'sale':
    case 'payout':
      // Recording sales and managing payouts for any ambassador, including the owner-linked
      // one, is normal day-to-day activity and shouldn't require owner login. Genuinely
      // sensitive surfaces (ambassador edits/deletes, owner-role changes) remain locked above.
      return
  }
}
