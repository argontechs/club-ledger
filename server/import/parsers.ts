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
  /** Commission amount the statement itself reports for this row, when present. */
  reportedCommission?: number
  /** Sale type the statement assigns this row (formats with mixed types per file). */
  saleType?: string
}

export interface ImportParseResult {
  ambassadorHint: string | null
  /** Statement's printed gross total — null when the format doesn't print one. */
  headerTotal: number | null
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

// Synthetic-id segments are capped so the assembled id always fits the
// varchar(50) external_order_id column (overflow would 500 the import, or
// worse, silently truncate and corrupt dedupe on non-strict MySQL). Slicing
// can only merge two distinct rows into the same id, which the occurrence
// suffix then disambiguates — no row is ever lost to the cap.
function idSegment(raw: string, max: number): string {
  return raw.replace(/[^A-Za-z0-9]/g, '').slice(0, max)
}

function syntheticOrderId(date: string, tableNumber: string, amount: number): string {
  const ymd = date.replace(/-/g, '').slice(2)
  const cents = Math.round(amount * 100)
  return `M-${ymd}-${idSegment(tableNumber, 20)}-${cents}`
}

// Statements legitimately repeat identical rows (two same-priced sales at the
// same table on the same night), so synthetic ids must disambiguate repeats
// or dedupe would silently drop real sales. Walk rows in DOCUMENT order: the
// first occurrence keeps the bare id (stable for already-imported data),
// repeats get -2, -3… — deterministic across re-parses of the same file.
function disambiguateId(id: string, seen: Map<string, number>): string {
  const n = (seen.get(id) ?? 0) + 1
  seen.set(id, n)
  return n === 1 ? id : `${id}-${n}`
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
    const seenIds = new Map<string, number>()
    while ((m = NONO_ORPHAN.exec(normalized))) {
      const amount = toNumber(m[4]!)
      if (amount === null) continue
      const id = disambiguateId(syntheticOrderId(m[1]!, m[2]!, amount), seenIds)
      rows.push({ date: m[1]!, externalOrderId: id, tableNumber: m[2]!, amount })
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

// --------------------------------------------------------------------------
// Format 3 — per-ambassador commission statement (exports from an operator's
// previous tracking system, e.g. 404's monthly COMM files). Rows carry their
// OWN sale type — Table and BGO sales mix in one file — so each row's type
// flows through to commit instead of one type for the whole file. The
// statement prints per-type commission totals and 'Amount paid', but NO
// gross total, so headerTotal is null and reconciliation runs against the
// commission figures instead.
// --------------------------------------------------------------------------
const STMT_ROW = /(\d{4}-\d{2}-\d{2}) (\S+) (\S+) RM ([\d,.]+) RM ([\d,.\-]+)/g
const STMT_PAID = /Amount paid:\s*RM\s*([\d,.]+)/
const STMT_HINT = /Ambassador\s+(.+?)\s+Statement period/

export const commissionStatementParser: ImportParser = {
  id: 'commission-statement-v1',
  label: 'Commission statement (per-ambassador, mixed sale types)',
  defaultSaleType: 'Table',
  detect(text) {
    const flat = text.replace(/\s+/g, ' ')
    let score = 0
    if (/Statement period/.test(flat)) score += 0.3
    if (/Amount paid:/.test(flat)) score += 0.3
    if (/\d{4}-\d{2}-\d{2} \S+ \S+ RM [\d,.]+ RM/.test(flat)) score += 0.4
    return score
  },
  parse(normalized) {
    const paid = normalized.match(STMT_PAID)
    const reportedCommissionTotal = paid ? toNumber(paid[1]!) : null
    const hint = normalized.match(STMT_HINT)

    const rows: ParsedImportRow[] = []
    const seenIds = new Map<string, number>()
    let m: RegExpExecArray | null
    STMT_ROW.lastIndex = 0
    while ((m = STMT_ROW.exec(normalized))) {
      const amount = toNumber(m[4]!)
      if (amount === null) continue
      const date = m[1]!
      const saleType = m[2]!
      const tableNumber = m[3]!
      const ymd = date.replace(/-/g, '').slice(2)
      // Type names can strip to nothing (e.g. Chinese labels) — fall back to
      // 'X' so the id shape stays valid. Caps keep the id within varchar(50).
      const safeType = idSegment(saleType, 12) || 'X'
      const safeTable = idSegment(tableNumber, 10)
      const id = disambiguateId(`S-${ymd}-${safeType}-${safeTable}-${Math.round(amount * 100)}`, seenIds)
      rows.push({
        date,
        externalOrderId: id,
        tableNumber,
        amount,
        saleType,
        reportedCommission: toNumber(m[5]!) ?? undefined,
      })
    }

    // Cross-check the statement against itself: its rows' commissions should
    // sum to what it claims was paid. A mismatch means the statement has
    // unlisted adjustments — the operator must see that before trusting it.
    const errors: string[] = []
    // Sum in integer cents — float accumulation across 70+ rows drifts by a cent.
    const commissionSum = rows.reduce((a, x) => a + Math.round((x.reportedCommission ?? 0) * 100), 0) / 100
    if (reportedCommissionTotal !== null && Math.abs(commissionSum - reportedCommissionTotal) > 0.05) {
      errors.push(
        `Statement says RM ${reportedCommissionTotal.toFixed(2)} was paid, but its rows' commissions sum to RM ${commissionSum.toFixed(2)} — it may contain unlisted adjustments.`,
      )
    }

    rows.sort((a, b) => a.date.localeCompare(b.date) || a.externalOrderId.localeCompare(b.externalOrderId))
    return { ambassadorHint: hint?.[1]?.trim() ?? null, headerTotal: null, reportedCommissionTotal, rows, errors }
  },
}

export const importParsers: ImportParser[] = [nonoTableParser, club404BgoParser, commissionStatementParser]

const MIN_CONFIDENCE = 0.5

export function detectParser(text: string): { parser: ImportParser; score: number } | null {
  let best: { parser: ImportParser; score: number } | null = null
  for (const parser of importParsers) {
    const score = parser.detect(text)
    if (!best || score > best.score) best = { parser, score }
  }
  return best && best.score >= MIN_CONFIDENCE ? best : null
}
