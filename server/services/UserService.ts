import { z } from 'zod'
import { eq, isNull, and } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'
import { hashPassword } from '~~/server/utils/password'
import { ApiError } from '~~/server/utils/errors'
import { assertNotOwnerProtected, type Actor } from '~~/server/utils/permissions'
import { PERMISSION_MODULES } from '~~/shared/permissions'

const AccessFields = {
  // Owner-managed: null = all clubs / tier-default permissions.
  clubAccess: z.array(z.number().int().positive()).max(100).nullish().optional(),
  permissions: z.partialRecord(
    z.enum(PERMISSION_MODULES),
    z.enum(['edit', 'view', 'none']),
  ).nullish().optional(),
}

const CreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(120),
  roleId: z.number().int().positive(),
  ambassadorId: z.number().int().nullish(),
  ...AccessFields,
})

const UpdateSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().min(1).max(120).optional(),
  roleId: z.number().int().positive().optional(),
  ambassadorId: z.number().int().nullish().optional(),
  ...AccessFields,
})

// Only the owner may grant/restrict access, and owner accounts are never
// restrictable (they always see every club with full permissions).
function sanitizeAccess(actor: Actor, targetIsOwner: boolean, v: { clubAccess?: number[] | null; permissions?: Record<string, any> | null }) {
  const wantsAccessChange = v.clubAccess !== undefined || v.permissions !== undefined
  if (!wantsAccessChange) return {}
  if (!(actor as any).isOwner) throw ApiError.forbidden('Only the owner can change access')
  if (targetIsOwner) return { clubAccess: null, permissions: null }
  return {
    ...(v.clubAccess !== undefined ? { clubAccess: v.clubAccess ?? null } : {}),
    ...(v.permissions !== undefined ? { permissions: v.permissions ?? null } : {}),
  }
}

async function loadOne(id: number) {
  const db = useDB()
  const r = await db.select({
    id: schema.users.id, email: schema.users.email, name: schema.users.name,
    roleId: schema.users.roleId, ambassadorId: schema.users.ambassadorId,
    clubAccess: schema.users.clubAccess, permissions: schema.users.permissions,
    role: schema.roles.name, isOwner: schema.roles.isOwner,
  }).from(schema.users).innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .where(eq(schema.users.id, id)).limit(1)
  return r[0]
}

// Logins hold company-level STAFF roles only (club_id IS NULL); commission
// roles belong to clubs and are assigned to ambassadors, never to users.
async function getStaffRole(roleId: number) {
  const r = await useDB().select().from(schema.roles).where(eq(schema.roles.id, roleId)).limit(1)
  const role = r[0]
  if (!role) return undefined
  if (role.clubId !== null) {
    throw ApiError.validation({ roleId: 'Users must be assigned a staff role, not a club commission role' })
  }
  return role
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
      isOwner: schema.roles.isOwner,
      clubAccess: schema.users.clubAccess, permissions: schema.users.permissions,
    }).from(schema.users).innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
      .where(isNull(schema.users.deletedAt))
  },

  async create(actor: Actor & { tier?: string }, body: unknown) {
    assertAdminTier(actor)
    const v = CreateSchema.parse(body)
    const targetRole = await getStaffRole(v.roleId)
    if (!targetRole) throw ApiError.validation({ roleId: 'Unknown role' })
    if (targetRole.isOwner === 1 && !(actor as any).isOwner)
      throw ApiError.forbidden('owner-protected')
    const access = sanitizeAccess(actor, targetRole.isOwner === 1, v)
    const passwordHash = await hashPassword(v.password)
    const r = await useDB().insert(schema.users).values({
      email: v.email, passwordHash, name: v.name,
      roleId: v.roleId, ambassadorId: v.ambassadorId ?? null,
      ...access,
    })
    return loadOne((r as any)[0].insertId)
  },

  async update(actor: Actor & { tier?: string }, id: number, body: unknown) {
    assertAdminTier(actor)
    const target = await loadOne(id)
    if (!target) throw ApiError.notFound('User')
    await assertNotOwnerProtected(actor, { kind: 'user', targetIsOwner: target.isOwner === 1 })
    const v = UpdateSchema.parse(body)
    if (v.roleId !== undefined) {
      const newRole = await getStaffRole(v.roleId)
      if (!newRole) throw ApiError.validation({ roleId: 'Unknown role' })
      if (newRole.isOwner === 1 && !(actor as any).isOwner)
        throw ApiError.forbidden('owner-protected')
      if (target.isOwner === 1 && newRole.isOwner !== 1) {
        const owners = await useDB().select().from(schema.users).innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
          .where(and(eq(schema.roles.isOwner, 1), isNull(schema.users.deletedAt)))
        if (owners.length <= 1) throw ApiError.conflict('Cannot demote the only owner')
      }
    }
    const targetWillBeOwner = v.roleId !== undefined
      ? ((await getStaffRole(v.roleId))?.isOwner === 1)
      : target.isOwner === 1
    const access = sanitizeAccess(actor, targetWillBeOwner, v)
    const patch: Record<string, unknown> = { updatedAt: new Date(), ...access }
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
    await assertNotOwnerProtected(actor, { kind: 'user', targetIsOwner: target.isOwner === 1 })
    if (target.isOwner === 1) throw ApiError.conflict('Cannot delete an owner')
    await useDB().update(schema.users).set({ deletedAt: new Date() }).where(eq(schema.users.id, id))
  },
}
