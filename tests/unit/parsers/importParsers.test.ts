import { describe, it, expect } from 'vitest'
import { nonoTableParser, club404BgoParser, detectParser } from '~~/server/import/parsers'

// Format fragments replicate each club's statement layout with invented data.
const NONO_TEXT = `AGENT COMMISSION ON DEMOAGENT 营业 2026-04
总计 RM 2,000.00 RM 160.00
2026-04-01 T260401000000001 CASH POS01 SRV A L11 Demo Package 1 RM 1,200.00 RM 96.00
2026-04-02 - V2 Walk In Package 1 RM 800.00 RM 64.00`

const C404_TEXT = `CLUB X AGENT COMMISSION ON Tester(QQ) 日期 DATE 结算时间 SETTLEMENT TIME 收据单号 RECEIPT NO. 开单人 ORDER NAME 桌号 TABLE 公关组业绩 BGO SALES 销售金额 AMT ORD 提成比例 COMM % 提成金额 COMM AMT 1 Apr 2026 2026-04-02 2:39 AM A00101202604020051 Tester(QQ) V333 RM 818.00 11.00% RM 89.98 3 Apr 2026 2026-04-04 12:29 AM A00101202604040010 Tester(QQ) L06 RM 758.00 11.00% RM 83.38 TOTAL RM - RM 1,576.00 RM 173.36`

const norm = (s: string) => s.replace(/\s+/g, ' ')

describe('import parser registry', () => {
  it('detects each format and prefers the right parser', () => {
    expect(detectParser(NONO_TEXT)?.parser.id).toBe('nono-table-v1')
    expect(detectParser(C404_TEXT)?.parser.id).toBe('club404-bgo-v1')
    expect(detectParser('completely unrelated text')).toBeNull()
  })

  it('nono parser: T-rows + orphan synthetic ids + 总计 total', () => {
    const r = nonoTableParser.parse(norm(NONO_TEXT), NONO_TEXT)
    expect(r.rows).toHaveLength(2)
    expect(r.rows[0]!.externalOrderId).toBe('T260401000000001')
    expect(r.rows[1]!.externalOrderId).toMatch(/^M-260402-V2-/)
    expect(r.headerTotal).toBe(2000)
    expect(r.ambassadorHint).toMatch(/DEMOAGENT/)
  })

  it('club404 parser: business date wins over settlement, receipt ids, reported rates, totals', () => {
    const r = club404BgoParser.parse(norm(C404_TEXT), C404_TEXT)
    expect(r.rows).toHaveLength(2)
    // Business night 1 Apr even though it settled 2:39 AM on 2 Apr
    expect(r.rows[0]).toMatchObject({
      date: '2026-04-01',
      externalOrderId: 'A00101202604020051',
      tableNumber: 'V333',
      amount: 818,
      reportedRate: 11,
    })
    expect(r.rows[1]!.date).toBe('2026-04-03')
    expect(r.headerTotal).toBe(1576)
    expect(r.reportedCommissionTotal).toBe(173.36)
    expect(r.ambassadorHint).toBe('Tester(QQ)')
    const sum = r.rows.reduce((a, x) => a + x.amount, 0)
    expect(sum).toBe(r.headerTotal)
  })

  it('club404 default sale type is BGO; nono is Table', () => {
    expect(club404BgoParser.defaultSaleType).toBe('BGO')
    expect(nonoTableParser.defaultSaleType).toBe('Table')
  })
})
