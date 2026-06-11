import { assertCan } from '~~/server/utils/permissions'
import { sql, eq } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  assertCan(event.context.user! as any, 'commissions', 'view')
  const clubId = await requireClubId(event)
  const rows = await useDB().select({
    month: sql<string>`SUBSTRING(${schema.sales.date}, 1, 7)`.as('month'),
  }).from(schema.sales)
    .where(eq(schema.sales.clubId, clubId))
    .groupBy(sql`SUBSTRING(${schema.sales.date}, 1, 7)`)
    .orderBy(sql`SUBSTRING(${schema.sales.date}, 1, 7) DESC`)
  return rows.map(r => r.month)
})
