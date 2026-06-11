import { describe, it, expect } from 'vitest'
import { nonoTableParser, club404BgoParser, commissionStatementParser, detectParser } from '~~/server/import/parsers'

// Format fragments replicate each club's statement layout with invented data.
const NONO_TEXT = `AGENT COMMISSION ON DEMOAGENT 营业 2026-04
总计 RM 2,000.00 RM 160.00
2026-04-01 T260401000000001 CASH POS01 SRV A L11 Demo Package 1 RM 1,200.00 RM 96.00
2026-04-02 - V2 Walk In Package 1 RM 800.00 RM 64.00`

const C404_TEXT = `CLUB X AGENT COMMISSION ON Tester(QQ) 日期 DATE 结算时间 SETTLEMENT TIME 收据单号 RECEIPT NO. 开单人 ORDER NAME 桌号 TABLE 公关组业绩 BGO SALES 销售金额 AMT ORD 提成比例 COMM % 提成金额 COMM AMT 1 Apr 2026 2026-04-02 2:39 AM A00101202604020051 Tester(QQ) V333 RM 818.00 11.00% RM 89.98 3 Apr 2026 2026-04-04 12:29 AM A00101202604040010 Tester(QQ) L06 RM 758.00 11.00% RM 83.38 TOTAL RM - RM 1,576.00 RM 173.36`

// Mixed Table/BGO statement, includes a legitimately repeated identical row
// (same date/type/table/amount twice) and per-type commission totals.
const STMT_TEXT = `Demo Commission Commission Statement Ambassador Tester Statement period December 2025 Paid date 10-01-2026, 12:00 pm Date Sale type Table # Gross amount Commission 2025-12-13 Table V111 RM 888.00 RM 106.56 2025-12-13 Table V111 RM 888.00 RM 106.56 2025-12-14 BGO L10 RM 900.00 RM 18.00 Table commission RM 213.12 BGO commission RM 18.00 Amount paid: RM 231.12 Reference: December_DEMO_2025`

const norm = (s: string) => s.replace(/\s+/g, ' ')

describe('import parser registry', () => {
  it('detects each format and prefers the right parser', () => {
    expect(detectParser(NONO_TEXT)?.parser.id).toBe('nono-table-v1')
    expect(detectParser(C404_TEXT)?.parser.id).toBe('club404-bgo-v1')
    expect(detectParser(STMT_TEXT)?.parser.id).toBe('commission-statement-v1')
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

  it('commission statement: per-row sale types, repeated identical rows survive dedupe, totals reconcile', () => {
    const r = commissionStatementParser.parse(norm(STMT_TEXT), STMT_TEXT)
    expect(r.rows).toHaveLength(3)
    // The two identical Table rows are BOTH kept, with occurrence-suffixed ids
    const tableRows = r.rows.filter(x => x.saleType === 'Table')
    expect(tableRows).toHaveLength(2)
    expect(tableRows[0]!.externalOrderId).toBe('S-251213-Table-V111-88800')
    expect(tableRows[1]!.externalOrderId).toBe('S-251213-Table-V111-88800-2')
    const bgo = r.rows.find(x => x.saleType === 'BGO')!
    expect(bgo).toMatchObject({ date: '2025-12-14', tableNumber: 'L10', amount: 900, reportedCommission: 18 })
    // No gross total printed; the paid amount is the reconciliation anchor
    expect(r.headerTotal).toBeNull()
    expect(r.reportedCommissionTotal).toBe(231.12)
    expect(r.errors).toHaveLength(0)
    expect(r.ambassadorHint).toBe('Tester')
  })

  it('commission statement: flags when row commissions do not sum to the amount paid', () => {
    const tampered = STMT_TEXT.replace('Amount paid: RM 231.12', 'Amount paid: RM 213.12')
    const r = commissionStatementParser.parse(norm(tampered), tampered)
    expect(r.errors).toHaveLength(1)
    expect(r.errors[0]).toMatch(/213\.12.*231\.12|231\.12.*213\.12/)
  })

  it('commission statement: synthetic ids stay within varchar(50) and survive degenerate type names', () => {
    // 30-char type token + 18-char table token + a type that strips to nothing
    const hostile = `Demo Commission Commission Statement Ambassador Tester Statement period December 2025 Date Sale type Table # Gross amount Commission 2025-12-13 TableBookingPackagePremiumVIP1 VVIPPremiumRoom001 RM 888.00 RM 106.56 2025-12-14 订台 L10 RM 900.00 RM 18.00 Amount paid: RM 124.56`
    const r = commissionStatementParser.parse(hostile.replace(/\s+/g, ' '), hostile)
    expect(r.rows).toHaveLength(2)
    const idRe = /^S-\d{6}-[A-Za-z0-9]{1,12}-[A-Za-z0-9]{0,10}-\d{1,12}(?:-\d{1,4})?$/
    for (const row of r.rows) {
      expect(row.externalOrderId.length).toBeLessThanOrEqual(50)
      expect(row.externalOrderId).toMatch(idRe)
    }
    // The all-CJK type strips to nothing and falls back to X instead of an empty segment
    expect(r.rows.find(x => x.saleType === '订台')!.externalOrderId).toBe('S-251214-X-L10-90000')
  })

  it('nono parser: repeated identical orphan rows get occurrence-suffixed ids', () => {
    const twin = `${NONO_TEXT}\n2026-04-02 - V2 Walk In Package 1 RM 800.00 RM 64.00`
    const r = nonoTableParser.parse(norm(twin), twin)
    const orphans = r.rows.filter(x => x.externalOrderId.startsWith('M-'))
    expect(orphans).toHaveLength(2)
    expect(orphans[0]!.externalOrderId).toBe('M-260402-V2-80000')
    expect(orphans[1]!.externalOrderId).toBe('M-260402-V2-80000-2')
  })
})
