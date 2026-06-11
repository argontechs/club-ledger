import { z } from 'zod'
import { eq, isNull, and } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'
import { hashPassword } from '~~/server/utils/password'
import { ApiError } from '~~/server/utils/errors'
import { assertNotOwnerProtected, type Actor } from '~~/server/utils/permissions'

const CreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(120),
  roleId: z.number().int().positive(),
  ambassadorId: z.number().int().nullish(),
})

const UpdateSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().min(1).max(120).optional(),
  roleId: z.number().int().positive().optional(),
  ambassadorId: z.number().int().nullish().optional(),
})

async function loadOne(id: number) {
  const db = useDB()
  const r = await db.select({
    id: schema.users.id, email: schema.users.email, name: schema.users.name,
    roleId: schema.users.roleId, ambassadorId: schema.users.ambassadorId,
    role: schema.roles.name,
  }).from(schema.users).innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .where(eq(schema.users.id, id)).limit(1)
  return r[0]
}

// Logins hold company-level STAFF roles only (club_id IS NULL); commission
// roles belong to clubs and are assigned to ambassadors, never to users.
async function getStaffRoleName(roleId: number) {
  const r = await useDB().select().from(schema.roles).where(eq(schema.roles.id, roleId)).limit(1)
  const role = r[0]
  if (!role) return undefined
  if (role.clubId !== null) {
    throw ApiError.validation({ roleId: 'Users must be assigned a staff role, not a club commission role' })
  }
  return role.name
}

function assertAdminTier(actor: Actor & { tier?: string }) {
  if ((actor as any).tier !== 'admin') {
    throw ApiError.forbidden('Insufficient role')
  }
}

export const UserService = {
  async list(actor: Actor & { tier?: string }) {
    assertAdminTier(actor)
    const db = useDB()
    return db.select({
      id: schema.users.id, email: schema.users.email, name: schema.users.name,
      ambassadorId: schema.users.ambassadorId, role: schema.roles.name,
    }).from(schema.users).innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
      .where(isNull(schema.users.deletedAt))
  },

  async create(actor: Actor & { tier?: string }, body: unknown) {
    assertAdminTier(actor)
    const v = CreateSchema.parse(body)
    const targetRole = await getStaffRoleName(v.roleId)
    if (!targetRole) throw ApiError.validation({ roleId: 'Unknown role' })
    if (targetRole === 'owner' && actor.roleName !== 'owner')
      throw ApiError.forbidden('owner-protected')
    const passwordHash = await hashPassword(v.password)
    const r = await useDB().insert(schema.users).values({
      email: v.email, passwordHash, name: v.name,
      roleId: v.roleId, ambassadorId: v.ambassadorId ?? null,
    })
    return loadOne((r as any)[0].insertId)
  },

  async update(actor: Actor & { tier?: string }, id: number, body: unknown) {
    assertAdminTier(actor)
    const target = await loadOne(id)
    if (!target) throw ApiError.notFound('User')
    await assertNotOwnerProtected(actor, { kind: 'user', targetRoleName: target.role })
    const v = UpdateSchema.parse(body)
    if (v.roleId !== undefined) {
      const newRole = await getStaffRoleName(v.roleId)
      if (!newRole) throw ApiError.validation({ roleId: 'Unknown role' })
      if (newRole === 'owner' && actor.roleName !== 'owner')
        throw ApiError.forbidden('owner-protected')
      if (target.role === 'owner' && newRole !== 'owner') {
        const owners = await useDB().select().from(schema.users).innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
          .where(and(eq(schema.roles.name, 'owner'), isNull(schema.users.deletedAt)))
        if (owners.length <= 1) throw ApiError.conflict('Cannot demote the only owner')
      }
    }
    const patch: Record<string, unknown> = { updatedAt: new Date() }
    if (v.email !== undefined) patch.email = v.email
    if (v.name !== undefined) patch.name = v.name
    if (v.roleId !== undefined) patch.roleId = v.roleId
    if (v.ambassadorId !== undefined) patch.ambassadorId = v.ambassadorId
    if (v.password !== undefined) patch.passwordHash = await hashPassword(v.password)
    await useDB().update(schema.users).set(patch).where(eq(schema.users.id, id))
    return loadOne(id)
  },

  async remove(actor: Actor & { tier?: string }, id: number) {
    assertAdminTier(actor)
    const target = await loadOne(id)
    if (!target) throw ApiError.notFound('User')
    await assertNotOwnerProtected(actor, { kind: 'user', targetRoleName: target.role })
    if (target.role === 'owner') throw ApiError.conflict('Cannot delete an owner')
    await useDB().update(schema.users).set({ deletedAt: new Date() }).where(eq(schema.users.id, id))
  },
}
