import { eq, and, isNull } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'
import { verifyToken } from '~~/server/utils/jwt'
import { ApiError } from '~~/server/utils/errors'

const PUBLIC_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/branding',
]

export default defineEventHandler(async (event) => {
  const url = event.node.req.url || ''
  if (!url.startsWith('/api/v1')) return
  if (PUBLIC_PATHS.some(p => url.startsWith(p))) return

  const auth = getHeader(event, 'authorization') || ''
  const match = auth.match(/^Bearer\s+(.+)$/i)
  if (!match) throw ApiError.unauthorized('Missing bearer token')

  const { jwtSecret } = useRuntimeConfig()
  let payload
  try { payload = verifyToken(match[1], jwtSecret) }
  catch { throw ApiError.unauthorized('Invalid token') }

  const db = useDB()
  const rows = await db.select({
    id: schema.users.id, email: schema.users.email, name: schema.users.name,
    roleId: schema.users.roleId, ambassadorId: schema.users.ambassadorId,
    roleName: schema.roles.name,
    tier: schema.roles.tier,
  })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .where(and(eq(schema.users.id, payload.sub), isNull(schema.users.deletedAt)))
    .limit(1)
  const user = rows[0]
  if (!user || !user.email) throw ApiError.unauthorized('User not found')

  event.context.user = user
})
