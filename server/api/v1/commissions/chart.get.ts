import { like, isNull } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'
import { computeCommissions, type CommissionRoleConfig, type CommissionEarner } from '~~/server/services/CommissionService'

export default defineEventHandler(async () => {
  const db = useDB()

  // Build last 6 months including current
  const months: string[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  // Load roles, users, and ambassadors once
  const roleRows = await db.select().from(schema.roles)

  const userRows = await db.select({
    id: schema.users.id,
    name: schema.users.name,
    ambassadorId: schema.users.ambassadorId,
  })
    .from(schema.users)
    .where(isNull(schema.users.deletedAt))

  const ambassadorRows = await db.select({
    id: schema.ambassadors.id,
    name: schema.ambassadors.name,
    roleId: schema.ambassadors.roleId,
  })
    .from(schema.ambassadors)
    .where(isNull(schema.ambassadors.deletedAt))

  const userByAmbassador = new Map<number, typeof userRows[number]>()
  for (const u of userRows) {
    if (u.ambassadorId != null) userByAmbassador.set(u.ambassadorId, u)
  }

  const earners: CommissionEarner[] = ambassadorRows.map(a => {
    const u = userByAmbassador.get(a.id)
    return {
      userId: u?.id ?? -a.id,
      name: a.name,
      roleId: a.roleId,
      ambassadorId: a.id,
    }
  })

  const roles: CommissionRoleConfig[] = roleRows.map(r => ({
    id: r.id,
    name: r.name,
    tier: r.tier,
    baseRate: Number(r.baseRate),
    bonusRate: r.bonusRate === null ? null : Number(r.bonusRate),
    requiresKpi: r.requiresKpi === 1,
    kpiThreshold: r.kpiThreshold === null ? null : Number(r.kpiThreshold),
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
    const rows = computeCommissions({ month, roles, earners, sales })
    const totalCommission = rows.reduce((a, r) => a + r.total, 0)
    result.push({ month, totalSales, totalCommission })
  }
  return result
})
