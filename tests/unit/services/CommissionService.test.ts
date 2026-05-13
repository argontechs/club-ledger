import { describe, it, expect } from 'vitest'
import { computeCommissions, type CommissionRoleConfig, type CommissionEarner, type CommissionSale } from '~~/server/services/CommissionService'

const month = '2026-04'

const roles: CommissionRoleConfig[] = [
  { id: 1, name: 'owner',      tier: 'admin',      baseRate: 10, bonusRate: 2,    requiresKpi: false, kpiThreshold: null },
  { id: 2, name: 'admin',      tier: 'admin',      baseRate: 12, bonusRate: 2,    requiresKpi: false, kpiThreshold: null },
  { id: 3, name: 'vip',        tier: 'ambassador', baseRate: 8,  bonusRate: 1,    requiresKpi: true,  kpiThreshold: 30000 },
  { id: 4, name: 'ambassador', tier: 'ambassador', baseRate: 8,  bonusRate: null, requiresKpi: false, kpiThreshold: null },
]

const earners: CommissionEarner[] = [
  { userId: 1,  name: 'Johnny', roleId: 1, ambassadorId: 10 },
  { userId: 2,  name: 'Mok',    roleId: 2, ambassadorId: 11 },
  { userId: -3, name: 'VIP A',  roleId: 3, ambassadorId: 13 },
  { userId: -4, name: 'VIP B',  roleId: 3, ambassadorId: 14 },
  { userId: -5, name: 'Plain',  roleId: 4, ambassadorId: 15 },
]

const sale = (ambassadorId: number, amount: number, rate = '8.00', status: 'draft' | 'confirmed' | 'voided' = 'confirmed'): CommissionSale => ({
  id: Math.floor(Math.random() * 1e9), date: '2026-04-10', ambassadorId, amount: amount.toFixed(2),
  status, type: 'Table', confirmedCommissionRate: status === 'confirmed' ? rate : null, confirmedBonusRate: null,
})

describe('computeCommissions (role-based)', () => {
  it('matches the spec §7 worked example', () => {
    const sales = [
      sale(10, 100_000, '10.00'),
      sale(11, 50_000,  '12.00'),
      sale(13, 50_000,  '8.00'),
      sale(14, 25_000,  '8.00'),
      sale(15, 30_000,  '8.00'),
      sale(99, 245_000, '8.00'),
    ]
    const result = computeCommissions({ month, roles, earners, sales })
    const byName = Object.fromEntries(result.map(r => [r.name, r]))

    expect(byName.Johnny.ownCommission).toBe(10_000)
    expect(byName.Johnny.bonus).toBe(10_000)
    expect(byName.Johnny.total).toBe(20_000)

    expect(byName.Mok.ownCommission).toBe(6_000)
    expect(byName.Mok.bonus).toBe(10_000)
    expect(byName.Mok.total).toBe(16_000)

    expect(byName['VIP A'].ownCommission).toBe(4_000)
    expect(byName['VIP A'].bonus).toBe(500)
    expect(byName['VIP A'].total).toBe(4_500)

    expect(byName['VIP B'].ownCommission).toBe(2_000)
    expect(byName['VIP B'].bonus).toBe(0)
    expect(byName['VIP B'].total).toBe(2_000)

    expect(byName.Plain.ownCommission).toBe(2_400)
    expect(byName.Plain.bonus).toBe(0)
    expect(byName.Plain.total).toBe(2_400)
  })

  it('excludes draft and voided sales from base and pool', () => {
    const sales = [
      sale(10, 100_000, '10.00', 'draft'),
      sale(10, 100_000, '10.00', 'voided'),
      sale(10, 100_000, '10.00', 'confirmed'),
    ]
    const r = computeCommissions({ month, roles, earners: [earners[0]], sales })
    expect(r[0].ownSales).toBe(100_000)
    expect(r[0].ownCommission).toBe(10_000)
    expect(r[0].bonus).toBe(2_000)
  })

  it('uses each sale row frozen rate (mid-month rate change)', () => {
    const sales = [
      sale(10, 100_000, '8.00'),
      sale(10, 100_000, '10.00'),
    ]
    const r = computeCommissions({ month, roles, earners: [earners[0]], sales })
    expect(r[0].ownCommission).toBe(8_000 + 10_000)
  })

  it('ambassador-tier bonus uses OWN sales, not pool', () => {
    const sales = [
      sale(13, 50_000, '8.00'),
      sale(99, 450_000, '8.00'),
    ]
    const r = computeCommissions({ month, roles, earners: [earners[2]], sales })
    expect(r[0].bonus).toBe(500)
  })

  it('KPI gating drops bonus when own sales below threshold', () => {
    const sales = [
      sale(14, 29_999, '8.00'),
    ]
    const r = computeCommissions({ month, roles, earners: [earners[3]], sales })
    expect(r[0].bonus).toBe(0)
  })
})
