import { eq, like, isNull } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'
import { computeCommissions } from '~~/server/services/CommissionService'

export default defineEventHandler(async () => {
  const db = useDB()

  // Build last 6 months including current
  const months: string[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  // Load all users once
  const userRows = await db.select({
    id: schema.users.id,
    name: schema.users.name,
    ambassadorId: schema.users.ambassadorId,
    role: schema.roles.name,
  })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .where(isNull(schema.users.deletedAt))

  const users = userRows.map(u => ({
    id: u.id,
    name: u.name,
    role: u.role,
    ambassadorId: u.ambassadorId ?? null,
  }))

  const result: Array<{ month: string; totalSales: number; totalCommission: number }> = []
  for (const month of months) {
    const saleRows = await db.select().from(schema.sales).where(like(schema.sales.date, `${month}%`))
    const sales = saleRows.map(s => ({
      id: s.id,
      date: s.date,
      ambassadorId: s.ambassadorId,
      amount: s.amount,
      status: s.status,
      type: s.type as 'Table' | 'BGO',
      confirmedCommissionRate: s.confirmedCommissionRate,
      confirmedBonusRate: s.confirmedBonusRate,
    }))
    const totalSales = sales
      .filter(s => s.status === 'confirmed')
      .reduce((a, s) => a + Number(s.amount), 0)
    const rows = computeCommissions({ month, users, sales })
    const totalCommission = rows.reduce((a, r) => a + r.total, 0)
    result.push({ month, totalSales, totalCommission })
  }
  return result
})
