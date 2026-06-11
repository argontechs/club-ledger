// Import-format registry. Every club sends a different statement layout, so
// each format is a small parser with a deterministic `detect` score; dry-run
// picks the best match per FILE (no per-club configuration to misconfigure).
// Adding a future club's format = adding one parser object here, with tests.
//
// Reliability contract (real money flows through this):
// - Every parser exposes the statement's own totals so the UI reconciles
//   parsed rows against what the club printed — mismatches are visible
//   before anything is committed.
// - Every row carries an external order/receipt id used for per-club dedupe
//   at dry-run, at commit, and (backstop) by a DB unique index.

export interface ParsedImportRow {
  date: string                 // business date YYYY-MM-DD
  externalOrderId: string
  tableNumber: string
  amount: number
  /** Commission % the statement itself reports for this row, when present. */
  reportedRate?: number
}

export interface ImportParseResult {
  ambassadorHint: string | null
  headerTotal: number
  /** Statement's own commission total, when the format prints one. */
  reportedCommissionTotal: number | null
  rows: ParsedImportRow[]
  errors: string[]
}

export interface ImportParser {
  id: string
  label: string
  /** Sale type these statements describe (must exist in the club's types). */
  defaultSaleType: string
  /** 0..1 confidence that `text` is this format. */
  detect(text: string): number
  parse(normalized: string, rawText: string): ImportParseResult
}

function toNumber(cell: string): number | null {
  const cleaned = cell.replace(/,/g, '').trim()
  if (cleaned === '-' || cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function syntheticOrderId(date: string, tableNumber: string, amount: number): string {
  const ymd = date.replace(/-/g, '').slice(2)
  const cents = Math.round(amount * 100)
  const safeTable = tableNumber.replace(/[^A-Za-z0-9]/g, '')
  return `M-${ymd}-${safeTable}-${cents}`
}

// --------------------------------------------------------------------------
// Format 1 — Nono Club table-booking statement (订台业绩明细).
// Rows keyed by T+15-digit order ids; header total marked 总计; agent hint
// after 'AGENT COMMISSION ON'.
// --------------------------------------------------------------------------
const NONO_ROW = /(\d{4}-\d{2}-\d{2})\s+(T\d{15})\s+\S+\s+\S+\s+\S+\s+\S+\s+(\S+)\s+(.+?)\s+\S+\s+RM\s+([\d,.\-]+)\s+RM\s*([\d,.\-]+)/g
const NONO_ORPHAN = /(\d{4}-\d{2}-\d{2})\s+-\s+(\S+)\s+(.+?)\s+\S+\s+RM\s+([\d,.\-]+)\s+RM\s*([\d,.\-]+)/g
const NONO_TOTAL = /总计\s+RM\s*([\d,.]+)\s+RM\s*([\d,.]+)/
const NONO_HINT = /AGENT COMMISSION ON\s+(.+?)\s+(?:营业|总计|\d{4}-\d{2}-\d{2})/i

export const nonoTableParser: ImportParser = {
  id: 'nono-table-v1',
  label: 'Table statement (订台业绩明细)',
  defaultSaleType: 'Table',
  detect(text) {
    let score = 0
    if (/T\d{15}/.test(text)) score += 0.6
    if (/总计/.test(text)) score += 0.3
    if (/订台/.test(text)) score += 0.1
    return score
  },
  parse(normalized, rawText) {
    const headerMatch = rawText.match(NONO_TOTAL)
    const headerTotal = headerMatch ? Number(headerMatch[1]!.replace(/,/g, '')) : 0
    const reportedCommissionTotal = headerMatch ? toNumber(headerMatch[2]!) : null
    const hintMatch = rawText.match(NONO_HINT)

    const rows: ParsedImportRow[] = []
    let m: RegExpExecArray | null
    NONO_ROW.lastIndex = 0
    while ((m = NONO_ROW.exec(normalized))) {
      const amount = toNumber(m[5]!)
      if (amount === null) continue
      rows.push({ date: m[1]!, externalOrderId: m[2]!, tableNumber: m[3]!, amount })
    }
    NONO_ORPHAN.lastIndex = 0
    while ((m = NONO_ORPHAN.exec(normalized))) {
      const amount = toNumber(m[4]!)
      if (amount === null) continue
      rows.push({ date: m[1]!, externalOrderId: syntheticOrderId(m[1]!, m[2]!, amount), tableNumber: m[2]!, amount })
    }
    rows.sort((a, b) => a.date.localeCompare(b.date) || a.externalOrderId.localeCompare(b.externalOrderId))
    return { ambassadorHint: hintMatch?.[1]?.trim() ?? null, headerTotal, reportedCommissionTotal, rows, errors: [] }
  },
}

// --------------------------------------------------------------------------
// Format 2 — Club 404 BGO statement ('CLUB 404 NOT FOUND', 公关组业绩 BGO SALES).
// Rows: business date · settlement datetime · A+17-digit receipt · agent ·
// table · RM amount · commission % · RM commission. The BUSINESS date is the
// sale date (settlement regularly crosses midnight). Validated against the
// real April 2026 statement: 39 rows, gross and commission sums reconcile
// with the printed TOTAL to the cent.
// --------------------------------------------------------------------------
const MONTH_NUM: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
}
const C404_ROW = /(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d{4}-\d{2}-\d{2}) \d{1,2}:\d{2} (?:AM|PM) (A\d{15,20}) (\S+) (\S+) RM ([\d,.]+) ([\d.]+)% RM ([\d,.\-]+)/g
const C404_TOTAL = /TOTAL RM\s*-?\s*RM\s*([\d,.]+)\s+RM\s*([\d,.]+)/
const C404_HINT = /AGENT COMMISSION ON\s+(\S+)/

export const club404BgoParser: ImportParser = {
  id: 'club404-bgo-v1',
  label: 'BGO statement (公关组业绩)',
  defaultSaleType: 'BGO',
  detect(text) {
    let score = 0
    if (/A\d{15,20}\s+\S+\s+\S+\s+RM/.test(text.replace(/\s+/g, ' '))) score += 0.5
    if (/BGO SALES|公关组业绩|收据单号/.test(text)) score += 0.3
    if (/TOTAL RM/.test(text.replace(/\s+/g, ' '))) score += 0.2
    return score
  },
  parse(normalized) {
    const total = normalized.match(C404_TOTAL)
    const headerTotal = total ? Number(total[1]!.replace(/,/g, '')) : 0
    const reportedCommissionTotal = total ? toNumber(total[2]!) : null
    const hint = normalized.match(C404_HINT)

    const rows: ParsedImportRow[] = []
    let m: RegExpExecArray | null
    C404_ROW.lastIndex = 0
    while ((m = C404_ROW.exec(normalized))) {
      const amount = toNumber(m[8]!)
      if (amount === null) continue
      const date = `${m[3]}-${String(MONTH_NUM[m[2]!]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`
      rows.push({
        date,
        externalOrderId: m[5]!,
        tableNumber: m[7]!,
        amount,
        reportedRate: toNumber(m[9]!) ?? undefined,
      })
    }
    rows.sort((a, b) => a.date.localeCompare(b.date) || a.externalOrderId.localeCompare(b.externalOrderId))
    return { ambassadorHint: hint?.[1]?.trim() ?? null, headerTotal, reportedCommissionTotal, rows, errors: [] }
  },
}

export const importParsers: ImportParser[] = [nonoTableParser, club404BgoParser]

const MIN_CONFIDENCE = 0.5

export function detectParser(text: string): { parser: ImportParser; score: number } | null {
  let best: { parser: ImportParser; score: number } | null = null
  for (const parser of importParsers) {
    const score = parser.detect(text)
    if (!best || score > best.score) best = { parser, score }
  }
  return best && best.score >= MIN_CONFIDENCE ? best : null
}
