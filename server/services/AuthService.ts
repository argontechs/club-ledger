import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { useDB, schema } from '~~/server/db/client'
import { verifyPassword } from '~~/server/utils/password'
import { signToken } from '~~/server/utils/jwt'
import { ApiError } from '~~/server/utils/errors'

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function login(body: unknown, jwtSecret: string) {
  const parsed = LoginSchema.safeParse(body)
  if (!parsed.success) {
    const details: Record<string, string> = {}
    for (const issue of parsed.error.issues) details[issue.path.join('.')] = issue.message
    throw ApiError.validation(details)
  }
  const { email, password } = parsed.data
  const db = useDB()
  const rows = await db.select({
    id: schema.users.id, email: schema.users.email, name: schema.users.name,
    passwordHash: schema.users.passwordHash, roleId: schema.users.roleId,
    ambassadorId: schema.users.ambassadorId, roleName: schema.roles.name,
  })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .where(eq(schema.users.email, email))
    .limit(1)
  const user = rows[0]
  if (!user) throw ApiError.unauthorized('Invalid credentials')
  if (!await verifyPassword(password, user.passwordHash)) throw ApiError.unauthorized('Invalid credentials')

  const token = signToken({ sub: user.id, role: user.roleName, ambassador_id: user.ambassadorId }, jwtSecret)
  return {
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.roleName, ambassadorId: user.ambassadorId },
  }
}
