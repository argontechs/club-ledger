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

  const ambassadorRows = await db.select({
    id: schema.ambassadors.id,
    name: schema.ambassadors.name,
  })
    .from(schema.ambassadors)
    .where(isNull(schema.ambassadors.deletedAt))

  const saleRows = await db.select().from(schema.sales).where(like(schema.sales.date, `${month}%`))

  // Build a unified earner list: every active ambassador becomes an entry, with
  // role/userId carried over from the linked user when one exists. Ambassadors
  // without a login show up here too, which matches the data model — every
  // confirmed sale earns its ambassador 8%, regardless of whether they sign in.
  const userByAmbassador = new Map<number, typeof userRows[number]>()
  for (const u of userRows) {
    if (u.ambassadorId != null) userByAmbassador.set(u.ambassadorId, u)
  }

  const earners = ambassadorRows.map(a => {
    const u = userByAmbassador.get(a.id)
    return {
      id: u?.id ?? -a.id,           // synthetic negative id when no user is linked
      name: a.name,
      role: u?.role ?? 'ambassador',
      ambassadorId: a.id,
    }
  })

  return computeCommissions({
    month,
    users: earners,
    sales: saleRows.map(s => ({
      id: s.id, date: s.date, ambassadorId: s.ambassadorId, amount: s.amount,
      status: s.status, type: s.type,
      confirmedCommissionRate: s.confirmedCommissionRate, confirmedBonusRate: s.confirmedBonusRate,
    })),
  })
}
