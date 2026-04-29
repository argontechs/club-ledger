import { desc } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'
export default defineEventHandler(async () => {
  const rows = await useDB().select({ month: schema.payouts.periodMonth })
    .from(schema.payouts)
    .groupBy(schema.payouts.periodMonth)
    .orderBy(desc(schema.payouts.periodMonth))
  return rows.map(r => r.month)
})
