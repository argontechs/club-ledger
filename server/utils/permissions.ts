import { eq, and } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'
import { ApiError } from './errors'

export type Actor = { id: number; roleName: string }

export type ProtectionTarget =
  | { kind: 'user'; targetRoleName: string }
  | { kind: 'ambassador'; ambassadorId: number }
  | { kind: 'sale'; ambassadorId: number }
  | { kind: 'payout'; ambassadorId: number }

export async function isOwnerProtectedAmbassador(ambassadorId: number): Promise<boolean> {
  const db = useDB()
  const rows = await db.select({ ambassadorId: schema.users.ambassadorId })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .where(and(eq(schema.roles.name, 'owner'), eq(schema.users.ambassadorId, ambassadorId)))
  return rows.length > 0
}

export async function assertNotOwnerProtected(actor: Actor, target: ProtectionTarget): Promise<void> {
  if (actor.roleName !== 'admin') return
  switch (target.kind) {
    case 'user':
      if (target.targetRoleName === 'owner') throw ApiError.forbidden('owner-protected')
      return
    case 'ambassador':
    case 'sale':
    case 'payout':
      if (await isOwnerProtectedAmbassador(target.ambassadorId)) throw ApiError.forbidden('owner-protected')
      return
  }
}
