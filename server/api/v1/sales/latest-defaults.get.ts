import { desc, eq } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  const clubId = await requireClubId(event)
  const rows = await useDB().select().from(schema.sales)
    .where(eq(schema.sales.clubId, clubId))
    .orderBy(desc(schema.sales.id)).limit(1)
  const last = rows[0]
  return {
    date: new Date().toISOString().slice(0, 10),
    ambassadorId: last?.ambassadorId ?? null,
  }
})
