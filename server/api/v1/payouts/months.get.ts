import { assertCan } from '~~/server/utils/permissions'
import { desc, eq } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  assertCan(event.context.user! as any, 'payouts', 'view')
  const clubId = await requireClubId(event)
  const rows = await useDB().select({ month: schema.payouts.periodMonth })
    .from(schema.payouts)
    .where(eq(schema.payouts.clubId, clubId))
    .groupBy(schema.payouts.periodMonth)
    .orderBy(desc(schema.payouts.periodMonth))
  return rows.map(r => r.month)
})
