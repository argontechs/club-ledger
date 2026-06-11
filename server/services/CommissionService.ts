import { eq, and, like, isNull } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'

export interface CommissionRoleConfig {
  id: number
  name: string
  tier: 'admin' | 'ambassador'
  baseRate: number
  bonusRate: number | null
  requiresKpi: boolean
  kpiThreshold: number | null
}

export interface CommissionEarner {
  userId: number
  name: string
  roleId: number
  ambassadorId: number
}

export interface CommissionSale {
  id: number
  date: string
  ambassadorId: number
  amount: string
  status: 'draft' | 'confirmed' | 'voided'
  type: string
  confirmedCommissionRate: string | null
  confirmedBonusRate: string | null
}

export interface CommissionRow {
  userId: number
  ambassadorId: number
  name: string
  roleId: number
  roleName: string
  tier: 'admin' | 'ambassador'
  ownSales: number
  ownCommission: number
  bonus: number
  total: number
}

export function computeCommissions(input: {
  month: string
  roles: ReadonlyArray<CommissionRoleConfig>
  earners: ReadonlyArray<CommissionEarner>
  sales: ReadonlyArray<CommissionSale>
}): CommissionRow[] {
  const confirmed = input.sales.filter(s => s.status === 'confirmed')
  const totalPool = confirmed.reduce((a, s) => a + Number(s.amount), 0)
  const rolesById = new Map(input.roles.map(r => [r.id, r]))

  return input.earners.map((e): CommissionRow => {
    const role = rolesById.get(e.roleId)
    if (!role) throw new Error(`Earner ${e.name} references unknown roleId ${e.roleId}`)

    const own = confirmed.filter(s => s.ambassadorId === e.ambassadorId)
    const ownSales = own.reduce((a, s) => a + Number(s.amount), 0)
    const ownCommission = own.reduce(
      (a, s) => a + Number(s.amount) * Number(s.confirmedCommissionRate ?? 0) / 100,
      0,
    )

    let bonus = 0
    if (role.bonusRate !== null && role.bonusRate > 0) {
      if (role.tier === 'admin') {
        bonus = totalPool * role.bonusRate / 100
      } else {
        const kpiPassed = !role.requiresKpi || (role.kpiThreshold !== null && ownSales >= role.kpiThreshold)
        if (kpiPassed) bonus = ownSales * role.bonusRate / 100
      }
    }

    return {
      userId: e.userId,
      ambassadorId: e.ambassadorId,
      name: e.name,
      roleId: e.roleId,
      roleName: role.name,
      tier: role.tier,
      ownSales: round2(ownSales),
      ownCommission: round2(ownCommission),
      bonus: round2(bonus),
      total: round2(ownCommission + bonus),
    }
  })
}

function round2(n: number) { return Math.round(n * 100) / 100 }

export async function loadCommissions(clubId: number, month: string): Promise<CommissionRow[]> {
  const db = useDB()
  const roleRows = await db.select().from(schema.roles)

  const userRows = await db.select({
    id: schema.users.id, name: schema.users.name, ambassadorId: schema.users.ambassadorId,
  })
    .from(schema.users)
    .where(isNull(schema.users.deletedAt))

  const ambassadorRows = await db.select({
    id: schema.ambassadors.id,
    name: schema.ambassadors.name,
    roleId: schema.ambassadors.roleId,
  })
    .from(schema.ambassadors)
    .where(and(isNull(schema.ambassadors.deletedAt), eq(schema.ambassadors.clubId, clubId)))

  const saleRows = await db.select().from(schema.sales)
    .where(and(like(schema.sales.date, `${month}%`), eq(schema.sales.clubId, clubId)))

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

  const roleConfigs: CommissionRoleConfig[] = roleRows.map(r => ({
    id: r.id,
    name: r.name,
    tier: r.tier,
    baseRate: Number(r.baseRate),
    bonusRate: r.bonusRate === null ? null : Number(r.bonusRate),
    requiresKpi: r.requiresKpi === 1,
    kpiThreshold: r.kpiThreshold === null ? null : Number(r.kpiThreshold),
  }))

  return computeCommissions({
    month,
    roles: roleConfigs,
    earners,
    sales: saleRows.map(s => ({
      id: s.id, date: s.date, ambassadorId: s.ambassadorId, amount: s.amount,
      status: s.status, type: s.type,
      confirmedCommissionRate: s.confirmedCommissionRate, confirmedBonusRate: s.confirmedBonusRate,
    })),
  })
}
