import { describe, it, expect } from 'vitest'
import { nonoTableParser, club404AgentParser, commissionStatementParser, detectParser, type PositionedPage } from '~~/server/import/parsers'

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
    expect(detectParser(C404_TEXT)?.parser.id).toBe('club404-agent-v1')
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
    const r = club404AgentParser.parse(norm(C404_TEXT), C404_TEXT)
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
    // Text-only parse (no positions): rows can't be classified and the
    // operator is warned instead of everything silently becoming one type.
    expect(r.rows.every(x => x.saleType === undefined)).toBe(true)
    expect(r.errors.some(e => /BGO\/AMT ORD column position/.test(e))).toBe(true)
  })

  it('club404 parser: classifies each row by which amount column it sits under', () => {
    // Geometry mirrors the real statement: BGO SALES header centred ~367,
    // AMT ORD ~433. Row 1's amount sits under BGO; row 2's under AMT ORD.
    const item = (str: string, x: number, y: number, w = 24) => ({ str, x, y, w })
    const pages: PositionedPage[] = [{
      items: [
        item('BGO SALES', 346, 658, 42),
        item('AMT ORD', 416, 658, 34),
        item('A00101202604020051', 178, 646, 75),
        item('818.00', 352, 646, 25),   // under BGO SALES → BGO
        item('89.98', 535, 646, 23),    // COMM AMT — far right, never the amount
        item('A00101202604040010', 178, 634, 75),
        item('758.00', 435, 634, 25),   // under AMT ORD → Table
        item('83.38', 535, 634, 23),
      ],
    }]
    const text = C404_TEXT
      .replace('TOTAL RM - RM 1,576.00 RM 173.36', 'TOTAL RM 818.00 RM 758.00 RM 173.36')
    const r = club404AgentParser.parse(norm(text), text, pages)
    expect(r.rows.find(x => x.externalOrderId === 'A00101202604020051')!.saleType).toBe('BGO')
    expect(r.rows.find(x => x.externalOrderId === 'A00101202604040010')!.saleType).toBe('Table')
    // Per-column totals reconcile against the per-type row sums → no errors
    expect(r.headerTotal).toBe(1576)
    expect(r.reportedCommissionTotal).toBe(173.36)
    expect(r.errors).toHaveLength(0)
  })

  it('club404 parser: per-column totals catch a misclassification', () => {
    // Same geometry but BOTH amounts under AMT ORD while the printed TOTAL
    // claims RM 818 of BGO — the per-column reconciliation must object.
    const item = (str: string, x: number, y: number, w = 24) => ({ str, x, y, w })
    const pages: PositionedPage[] = [{
      items: [
        item('BGO SALES', 346, 658, 42),
        item('AMT ORD', 416, 658, 34),
        item('A00101202604020051', 178, 646, 75),
        item('818.00', 435, 646, 25),
        item('A00101202604040010', 178, 634, 75),
        item('758.00', 435, 634, 25),
      ],
    }]
    const text = C404_TEXT
      .replace('TOTAL RM - RM 1,576.00 RM 173.36', 'TOTAL RM 818.00 RM 758.00 RM 173.36')
    const r = club404AgentParser.parse(norm(text), text, pages)
    expect(r.errors.some(e => /BGO SALES total/.test(e))).toBe(true)
    expect(r.errors.some(e => /AMT ORD total/.test(e))).toBe(true)
  })

  it('club404 parser: continuation pages without headers inherit the column map', () => {
    // Real multi-page statements drop the header row on continuation pages
    // (JOHNNY.pdf May 2026: 9 receipts on page 2, no headers). Page 2's rows
    // classify using page 1's column geometry: one under AMT ORD, one under
    // BGO SALES.
    const item = (str: string, x: number, y: number, w = 24) => ({ str, x, y, w })
    const pages: PositionedPage[] = [
      {
        items: [
          item('BGO SALES', 346, 658, 42),
          item('AMT ORD', 416, 658, 34),
          item('A00101202604020051', 178, 646, 75),
          item('818.00', 435, 646, 25),
          item('A00101202604040010', 178, 634, 75),
          item('758.00', 435, 634, 25),
        ],
      },
      {
        items: [
          item('A00101202604050020', 178, 700, 75),
          item('640.00', 435, 700, 25),
          item('A00101202604050021', 178, 688, 75),
          item('500.00', 352, 688, 25),
        ],
      },
    ]
    const text = C404_TEXT
      .replace(' TOTAL RM - RM 1,576.00 RM 173.36',
        ' 5 Apr 2026 2026-04-05 11:10 PM A00101202604050020 Tester(QQ) K01 RM 640.00 11.00% RM 70.40'
        + ' 5 Apr 2026 2026-04-05 11:40 PM A00101202604050021 Tester(QQ) K02 RM 500.00 11.00% RM 55.00'
        + ' TOTAL RM 500.00 RM 2,216.00 RM 298.36')
    const r = club404AgentParser.parse(norm(text), text, pages)
    expect(r.rows).toHaveLength(4)
    expect(r.rows.filter(x => x.saleType === undefined)).toHaveLength(0)
    expect(r.rows.find(x => x.externalOrderId === 'A00101202604050020')!.saleType).toBe('Table')
    expect(r.rows.find(x => x.externalOrderId === 'A00101202604050021')!.saleType).toBe('BGO')
    // Per-column totals reconcile (BGO 500; AMT 818+758+640=2216) → clean
    expect(r.errors).toHaveLength(0)
  })

  it('club404 parser: no headers on ANY page → rows unclassified with a warning, never silently typed', () => {
    const item = (str: string, x: number, y: number, w = 24) => ({ str, x, y, w })
    const pages: PositionedPage[] = [{
      items: [
        item('A00101202604020051', 178, 646, 75),
        item('818.00', 435, 646, 25),
      ],
    }]
    const r = club404AgentParser.parse(norm(C404_TEXT), C404_TEXT, pages)
    expect(r.rows.every(x => x.saleType === undefined)).toBe(true)
    expect(r.errors.some(e => /column position/.test(e))).toBe(true)
  })

  it('club404 default sale type is Table (AMT ORD column); nono is Table', () => {
    expect(club404AgentParser.defaultSaleType).toBe('Table')
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
