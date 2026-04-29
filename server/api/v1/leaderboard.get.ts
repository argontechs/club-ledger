import { eq, and, like, isNull, sql } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'
import { ApiError } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const month = String(q.month || '')
  if (!/^\d{4}-\d{2}$/.test(month)) throw ApiError.validation({ month: 'expected YYYY-MM' })
  const type = q.type as 'Table' | 'BGO' | 'all' | undefined

  const db = useDB()
  const where = [
    eq(schema.sales.status, 'confirmed'),
    like(schema.sales.date, `${month}%`),
    ...(type && type !== 'all' ? [eq(schema.sales.type, type)] : []),
  ]
  const rows = await db.select({
    ambassadorId: schema.ambassadors.id,
    name: schema.ambassadors.name,
    totalSales: sql<string>`COALESCE(SUM(${schema.sales.amount}), 0)`.as('total_sales'),
    saleCount: sql<number>`COUNT(${schema.sales.id})`.as('sale_count'),
  })
    .from(schema.ambassadors)
    .leftJoin(schema.sales, and(eq(schema.sales.ambassadorId, schema.ambassadors.id), ...where))
    .where(isNull(schema.ambassadors.deletedAt))
    .groupBy(schema.ambassadors.id, schema.ambassadors.name)

  return rows
    .map(r => ({ ...r, totalSales: Number(r.totalSales), saleCount: Number(r.saleCount) }))
    .sort((a, b) => b.totalSales - a.totalSales)
})
