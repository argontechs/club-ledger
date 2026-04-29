import { desc } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'
export default defineEventHandler(async () => {
  const rows = await useDB().select().from(schema.sales).orderBy(desc(schema.sales.id)).limit(1)
  const last = rows[0]
  return {
    date: new Date().toISOString().slice(0, 10),
    ambassadorId: last?.ambassadorId ?? null,
  }
})
