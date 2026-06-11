import { eq, and, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { useDB, schema } from '~~/server/db/client'
import { hashPassword, verifyPassword } from '~~/server/utils/password'
import { signToken } from '~~/server/utils/jwt'
import { ApiError } from '~~/server/utils/errors'

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.boolean().optional(),
})

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(128),
})

export async function login(body: unknown, jwtSecret: string) {
  const parsed = LoginSchema.safeParse(body)
  if (!parsed.success) {
    const details: Record<string, string> = {}
    for (const issue of parsed.error.issues) details[issue.path.join('.')] = issue.message
    throw ApiError.validation(details)
  }
  const { email, password, remember } = parsed.data
  const db = useDB()
  const rows = await db.select({
    id: schema.users.id, email: schema.users.email, name: schema.users.name,
    passwordHash: schema.users.passwordHash, roleId: schema.users.roleId,
    ambassadorId: schema.users.ambassadorId, roleName: schema.roles.name,
    tier: schema.roles.tier, isOwner: schema.roles.isOwner,
  })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .where(and(eq(schema.users.email, email), isNull(schema.users.deletedAt)))
    .limit(1)
  const user = rows[0]
  if (!user) throw ApiError.unauthorized('Invalid credentials')
  if (!await verifyPassword(password, user.passwordHash)) throw ApiError.unauthorized('Invalid credentials')

  const token = signToken(
    { sub: user.id, role: user.roleName, ambassador_id: user.ambassadorId },
    jwtSecret,
    remember ? '7d' : '8h',
  )
  return {
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.roleName, tier: user.tier, isOwner: user.isOwner === 1, ambassadorId: user.ambassadorId },
  }
}

export async function changePassword(userId: number, body: unknown) {
  const parsed = ChangePasswordSchema.safeParse(body)
  if (!parsed.success) {
    const details: Record<string, string> = {}
    for (const issue of parsed.error.issues) details[issue.path.join('.')] = issue.message
    throw ApiError.validation(details)
  }
  const { currentPassword, newPassword } = parsed.data
  if (currentPassword === newPassword)
    throw ApiError.validation({ newPassword: 'New password must differ from current password' })

  const db = useDB()
  const rows = await db.select({ id: schema.users.id, passwordHash: schema.users.passwordHash })
    .from(schema.users)
    .where(and(eq(schema.users.id, userId), isNull(schema.users.deletedAt)))
    .limit(1)
  const user = rows[0]
  if (!user) throw ApiError.unauthorized()
  if (!await verifyPassword(currentPassword, user.passwordHash))
    throw ApiError.validation({ currentPassword: 'Current password is incorrect' })

  const passwordHash = await hashPassword(newPassword)
  await db.update(schema.users).set({ passwordHash, updatedAt: new Date() }).where(eq(schema.users.id, userId))
  return { ok: true }
}
