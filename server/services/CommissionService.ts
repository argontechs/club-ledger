import { eq, and, like, isNull } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'

export interface CommissionUser {
  id: number
  name: string
  role: string
  ambassadorId: number | null
}

export interface CommissionSale {
  id: number
  date: string
  ambassadorId: number
  amount: string
  status: 'draft' | 'confirmed' | 'voided'
  type: 'Table' | 'BGO'
  confirmedCommissionRate: string | null
  confirmedBonusRate: string | null
}

export interface CommissionRow {
  userId: number
  ambassadorId: number | null
  name: string
  role: string
  ownSales: number
  ownCommission: number
  bonus: number
  total: number
}

const BONUS_ROLES = new Set(['owner', 'admin'])

export function computeCommissions(input: {
  month: string
  users: ReadonlyArray<CommissionUser>
  sales: ReadonlyArray<CommissionSale>
}): CommissionRow[] {
  const confirmed = input.sales.filter(s => s.status === 'confirmed')

  const bonusPool = confirmed.reduce((acc, s) => {
    const rate = Number(s.confirmedBonusRate ?? 0)
    return acc + Number(s.amount) * rate / 100
  }, 0)

  return input.users.map((u): CommissionRow => {
    const own = u.ambassadorId
      ? confirmed.filter(s => s.ambassadorId === u.ambassadorId)
      : []
    const ownSales = own.reduce((a, s) => a + Number(s.amount), 0)
    const ownCommission = own.reduce(
      (a, s) => a + Number(s.amount) * Number(s.confirmedCommissionRate ?? 0) / 100,
      0,
    )
    const bonus = BONUS_ROLES.has(u.role) ? bonusPool : 0
    return {
      userId: u.id, ambassadorId: u.ambassadorId, name: u.name, role: u.role,
      ownSales: round2(ownSales), ownCommission: round2(ownCommission),
      bonus: round2(bonus), total: round2(ownCommission + bonus),
    }
  })
}

function round2(n: number) { return Math.round(n * 100) / 100 }

export async function loadCommissions(month: string): Promise<CommissionRow[]> {
  const db = useDB()
  const userRows = await db.select({
    id: schema.users.id, name: schema.users.name, ambassadorId: schema.users.ambassadorId,
    role: schema.roles.name,
  })
    .from(schema.users)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.users.roleId))
    .where(isNull(schema.users.deletedAt))
  const saleRows = await db.select().from(schema.sales).where(like(schema.sales.date, `${month}%`))
  return computeCommissions({
    month,
    users: userRows.map(u => ({ id: u.id, name: u.name, role: u.role, ambassadorId: u.ambassadorId ?? null })),
    sales: saleRows.map(s => ({
      id: s.id, date: s.date, ambassadorId: s.ambassadorId, amount: s.amount,
      status: s.status, type: s.type,
      confirmedCommissionRate: s.confirmedCommissionRate, confirmedBonusRate: s.confirmedBonusRate,
    })),
  })
}
