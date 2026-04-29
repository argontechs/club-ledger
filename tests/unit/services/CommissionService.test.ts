import { describe, it, expect } from 'vitest'
import { computeCommissions } from '~~/server/services/CommissionService'

const month = '2026-04'

const users = [
  { id: 1, name: 'Johnny', role: 'owner', ambassadorId: 10 },
  { id: 2, name: 'Mok', role: 'admin', ambassadorId: 11 },
  { id: 3, name: 'Leader A', role: 'leader', ambassadorId: 12 },
  { id: 4, name: 'Amb B', role: 'ambassador', ambassadorId: 13 },
] as const

const sale = (ambassadorId: number, amount: number, status: 'draft' | 'confirmed' | 'voided' = 'confirmed') => ({
  id: Math.random(), date: '2026-04-10', ambassadorId, amount: amount.toFixed(2),
  status, type: 'Table' as const, confirmedCommissionRate: status === 'confirmed' ? '8.00' : null,
  confirmedBonusRate: status === 'confirmed' ? '1.00' : null,
})

describe('computeCommissions', () => {
  it('matches the §5.4 worked example', () => {
    const sales = [
      sale(10, 100_000),
      sale(11, 50_000),
      sale(12, 80_000),
      sale(13, 30_000),
      // some other ambassador (not in users list) sells 240,000 to make total 500,000
      sale(99, 240_000),
    ]
    const result = computeCommissions({ month, users, sales })
    const byName = Object.fromEntries(result.map(r => [r.name, r]))
    expect(byName.Johnny.ownSales).toBe(100_000)
    expect(byName.Johnny.ownCommission).toBe(8_000)
    expect(byName.Johnny.bonus).toBe(5_000)
    expect(byName.Johnny.total).toBe(13_000)

    expect(byName.Mok.total).toBe(9_000)
    expect(byName['Leader A'].total).toBe(6_400)
    expect(byName['Leader A'].bonus).toBe(0)
    expect(byName['Amb B'].total).toBe(2_400)
  })

  it('excludes draft and voided sales', () => {
    const sales = [
      sale(10, 100_000, 'draft'),
      sale(10, 100_000, 'voided'),
      sale(10, 100_000, 'confirmed'),
    ]
    const r = computeCommissions({ month, users: [users[0]], sales })
    expect(r[0].ownSales).toBe(100_000)
    expect(r[0].ownCommission).toBe(8_000)
    expect(r[0].bonus).toBe(1_000)
  })

  it('uses each sale row’s frozen rate (handles mid-month rate changes)', () => {
    const sales = [
      { ...sale(10, 100_000), confirmedCommissionRate: '8.00', confirmedBonusRate: '1.00' },
      { ...sale(10, 100_000), confirmedCommissionRate: '10.00', confirmedBonusRate: '2.00' },
    ]
    const r = computeCommissions({ month, users: [users[0]], sales })
    expect(r[0].ownCommission).toBe(100_000 * 0.08 + 100_000 * 0.10)  // 18,000
    expect(r[0].bonus).toBe(100_000 * 0.01 + 100_000 * 0.02)          // 3,000
  })
})
