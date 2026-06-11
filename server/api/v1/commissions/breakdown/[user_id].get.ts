import { assertCan } from '~~/server/utils/permissions'
import { eq, and, like, isNull } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'
import { ApiError } from '~~/server/utils/errors'
import { requireClubId } from '~~/server/utils/club'

export default defineEventHandler(async (event) => {
  assertCan(event.context.user! as any, 'commissions', 'view')
  const userId = Number(getRouterParam(event, 'user_id'))
  const month = String(getQuery(event).month || '')
  if (!/^\d{4}-\d{2}$/.test(month)) throw ApiError.validation({ month: 'expected YYYY-MM' })

  const actor = event.context.user!
  if ((actor as any).tier !== 'admin' && userId !== actor.id) {
    throw ApiError.forbidden()
  }

  const db = useDB()
  const userRow = await db.select({
    id: schema.users.id, name: schema.users.name, ambassadorId: schema.users.ambassadorId,
    role: schema.roles.name,
  })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .where(eq(schema.users.id, userId))
    .limit(1)
  const u = userRow[0]
  if (!u) throw ApiError.notFound('User')

  const clubId = await requireClubId(event)
  const sales = u.ambassadorId
    ? await db.select().from(schema.sales)
        .where(and(
          eq(schema.sales.ambassadorId, u.ambassadorId),
          eq(schema.sales.clubId, clubId),
          like(schema.sales.date, `${month}%`),
        ))
    : []

  return { user: u, sales }
})
