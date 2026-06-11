import { assertCan } from '~~/server/utils/permissions'
import { eq, like, isNull, and, sql } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'
import { ApiError } from '~~/server/utils/errors'
import { requireClubId } from '~~/server/utils/club'

export default defineEventHandler(async (event) => {
  assertCan(event.context.user! as any, 'commissions', 'view')
  const month = String(getQuery(event).month || '')
  if (!/^\d{4}-\d{2}$/.test(month)) throw ApiError.validation({ month: 'expected YYYY-MM' })
  const clubId = await requireClubId(event)
  const db = useDB()
  // Active ambassadors with at least one confirmed sale this month
  const rows = await db.select({
    id: schema.ambassadors.id,
    name: schema.ambassadors.name,
    fullName: schema.ambassadors.fullName,
    isProtected: schema.ambassadors.isProtected,
    salesTotal: sql<string>`COALESCE(SUM(${schema.sales.amount}), 0)`.as('sales_total'),
  })
    .from(schema.ambassadors)
    .leftJoin(schema.sales, and(
      eq(schema.sales.ambassadorId, schema.ambassadors.id),
      eq(schema.sales.status, 'confirmed'),
      like(schema.sales.date, `${month}%`),
    ))
    .where(and(isNull(schema.ambassadors.deletedAt), eq(schema.ambassadors.clubId, clubId)))
    .groupBy(schema.ambassadors.id, schema.ambassadors.name, schema.ambassadors.fullName, schema.ambassadors.isProtected)
    .having(sql`COALESCE(SUM(${schema.sales.amount}), 0) > 0`)
  // Annotate which already have a payout
  const existingPayouts = await db.select({ ambassadorId: schema.payouts.ambassadorId })
    .from(schema.payouts)
    .where(and(eq(schema.payouts.periodMonth, month), eq(schema.payouts.clubId, clubId)))
  const paidSet = new Set(existingPayouts.map(p => p.ambassadorId))
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    fullName: r.fullName,
    salesTotal: Number(r.salesTotal),
    alreadyPaid: paidSet.has(r.id),
  }))
})
