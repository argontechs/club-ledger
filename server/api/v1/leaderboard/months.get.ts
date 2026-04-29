import { sql } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'
export default defineEventHandler(async () => {
  const rows = await useDB().select({
    month: sql<string>`SUBSTRING(${schema.sales.date}, 1, 7)`.as('month'),
  }).from(schema.sales).groupBy(sql`SUBSTRING(${schema.sales.date}, 1, 7)`).orderBy(sql`SUBSTRING(${schema.sales.date}, 1, 7) DESC`)
  return rows.map(r => r.month)
})
