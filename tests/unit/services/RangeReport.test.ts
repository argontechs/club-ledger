import { describe, it, expect } from 'vitest'
import { computeRangeReport, buildRangeReportHtml } from '~~/server/services/PayoutPdfService'

const names = new Map([[1, 'Aiman'], [2, 'Sara']])

describe('computeRangeReport', () => {
  it('groups confirmed sales per ambassador at frozen rates', () => {
    const { rows, totals } = computeRangeReport([
      { ambassadorId: 1, amount: '1000.00', confirmedCommissionRate: '8.00' },
      { ambassadorId: 1, amount: '500.00', confirmedCommissionRate: '10.00' },
      { ambassadorId: 2, amount: '2000.00', confirmedCommissionRate: '8.00' },
    ], names)
    const aiman = rows.find(r => r.ambassadorId === 1)!
    expect(aiman.saleCount).toBe(2)
    expect(aiman.gross).toBe(1500)
    expect(aiman.commission).toBe(80 + 50)
    expect(totals.gross).toBe(3500)
    expect(totals.commission).toBe(290)
    // sorted by gross desc
    expect(rows[0]!.ambassadorId).toBe(2)
  })

  it('treats missing frozen rates as zero commission', () => {
    const { totals } = computeRangeReport([
      { ambassadorId: 1, amount: '1000.00', confirmedCommissionRate: null },
    ], names)
    expect(totals.commission).toBe(0)
    expect(totals.gross).toBe(1000)
  })
})

describe('buildRangeReportHtml', () => {
  it('renders rows, totals, range, and the bonus exclusion note', () => {
    const { rows, totals } = computeRangeReport([
      { ambassadorId: 1, amount: '1000.00', confirmedCommissionRate: '8.00' },
    ], names)
    const html = buildRangeReportHtml({
      clubName: 'Neon KL', from: '2026-06-01', to: '2026-06-07',
      settings: { currency_symbol: '$' }, rows, totals,
    })
    expect(html).toContain('Neon KL')
    expect(html).toContain('2026-06-01')
    expect(html).toContain('Aiman')
    expect(html).toContain('Gross ($)')
    expect(html).toContain('Monthly bonuses are settled at month close')
  })
})
