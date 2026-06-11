import { describe, it, expect } from 'vitest'
import { derivePayoutTotals, buildSummaryHtml, buildPayslipHtml, type PayoutPdfContext } from '~~/server/services/PayoutPdfService'

const baseCtx = (over: Partial<PayoutPdfContext['totals']> = {}): PayoutPdfContext => ({
  payout: { id: 1, periodMonth: '2026-04', amount: '2100.00', paidAt: null, snapshotBonusRate: '1.00' },
  ambassador: { name: 'Mok', fullName: 'Mok T.', ic: null, bankName: null },
  settings: {},
  rows: [{ date: '2026-04-05', type: 'Table', tableNumber: 'L1', amount: 20000, commissionRate: 8, commission: 1600 }],
  totals: { gross: 20000, commission: 1600, extra: 500, total: 2100, ...over },
})

describe('derivePayoutTotals', () => {
  it('total is the stored payout amount; extra is the difference', () => {
    expect(derivePayoutTotals(2100, 1600)).toEqual({ commission: 1600, extra: 500, total: 2100 })
  })
  it('rounds to 2dp and supports negative adjustments', () => {
    expect(derivePayoutTotals(1500, 1600.004)).toEqual({ commission: 1600, extra: -100, total: 1500 })
  })
})

describe('payslip/summary HTML', () => {
  it('payslip total payable equals the stored payout amount', () => {
    const html = buildPayslipHtml(baseCtx())
    expect(html).toContain('2,100.00')
    expect(html).toContain('Bonus')
    expect(html).not.toContain('Owner / Admin')
    expect(html).not.toContain('Owner / admin')
  })
  it('shows Adjustment for negative extras and no bonus line at zero', () => {
    const neg = buildPayslipHtml(baseCtx({ extra: -100, total: 1500 }))
    expect(neg).toContain('Adjustment')
    const zero = buildPayslipHtml(baseCtx({ extra: 0, total: 1600 }))
    expect(zero).not.toContain('Bonus')
    expect(zero).not.toContain('Adjustment')
  })
  it('summary grand total equals the stored payout amount', () => {
    const html = buildSummaryHtml(baseCtx())
    expect(html).toContain('2,100.00')
    expect(html).not.toContain('Owner / Admin')
  })
})
