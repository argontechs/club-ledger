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

/** A text fragment with its position on the page. Formats that put meaning
 * in COLUMNS (e.g. 404's separate BGO SALES vs AMT ORD amount columns) need
 * x-coordinates — flat text extraction loses which column a number was in. */
export interface PositionedItem { str: string; x: number; y: number; w: number }
export interface PositionedPage { items: PositionedItem[] }

export interface ImportParser {
  id: string
  label: string
  /** Fallback sale type for rows that don't carry their own (must exist in the club's types). */
  defaultSaleType: string
  /** 0..1 confidence that `text` is this format. */
  detect(text: string): number
  parse(normalized: string, rawText: string, pages?: PositionedPage[]): ImportParseResult
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
// Format 2 — Club 404 agent statement ('CLUB 404 NOT FOUND', AGENT COMMISSION).
// Rows: business date · settlement datetime · A+17-digit receipt · agent ·
// table · RM amount · commission % · RM commission. The BUSINESS date is the
// sale date (settlement regularly crosses midnight).
//
// CRITICAL COLUMN SEMANTICS: the statement has TWO amount columns —
// 公关组业绩 BGO SALES and 销售金额 AMT ORD — and which column a row's amount
// sits under decides its sale type (AMT ORD = table sale, BGO SALES = BGO).
// Flat text extraction loses the column, so classification uses each
// amount's x-coordinate against the header positions, and the printed
// per-column TOTAL cells are reconciled against the per-type row sums so a
// misclassification can never pass silently. The COMM % / COMM AMT columns
// are never used as data — the system computes commissions itself from each
// ambassador's rate plan; the printed totals serve only as a cross-check.
// Validated against the real April 2026 statement: 39 rows, all under
// AMT ORD (BGO total prints '-'), gross reconciles to the cent.
// --------------------------------------------------------------------------
const MONTH_NUM: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
}
const C404_ROW = /(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d{4}-\d{2}-\d{2}) \d{1,2}:\d{2} (?:AM|PM) (A\d{15,20}) (\S+) (\S+) RM ([\d,.]+) ([\d.]+)% RM ([\d,.\-]+)/g
const C404_TOTAL_CELLS = /TOTAL((?:\s+RM\s*(?:-|[\d,.]+))+)/
const C404_HINT = /AGENT COMMISSION ON\s+(\S+)/
const NUMERIC_CELL = /^-?[\d,]+\.\d{2}$/

/** Column x-centers per page, taken from the header row. */
function c404ColumnMap(page: PositionedPage): { bgo: number; amt: number } | null {
  const bgoH = page.items.find(i => i.str.includes('BGO SALES') || i.str.includes('公关组业绩'))
  const amtH = page.items.find(i => i.str.includes('AMT ORD'))
  if (!bgoH || !amtH) return null
  return { bgo: bgoH.x + bgoH.w / 2, amt: amtH.x + amtH.w / 2 }
}

export const club404AgentParser: ImportParser = {
  id: 'club404-agent-v1',
  label: 'Agent statement (BGO / AMT ORD columns)',
  defaultSaleType: 'Table',
  detect(text) {
    let score = 0
    if (/A\d{15,20}\s+\S+\s+\S+\s+RM/.test(text.replace(/\s+/g, ' '))) score += 0.5
    if (/BGO SALES|公关组业绩|收据单号/.test(text)) score += 0.3
    if (/TOTAL RM/.test(text.replace(/\s+/g, ' '))) score += 0.2
    return score
  },
  parse(normalized, _rawText, pages) {
    const errors: string[] = []
    const hint = normalized.match(C404_HINT)

    // Positional context: per page, the BGO/AMT column centers, the numeric
    // cells, and where each receipt id sits (consumed once per occurrence).
    const pageCtx = (pages ?? []).map(p => ({
      cols: c404ColumnMap(p),
      numeric: p.items.filter(i => NUMERIC_CELL.test(i.str.trim())),
      receiptItems: new Map<string, PositionedItem[]>(),
      items: p.items,
    }))
    // Continuation pages drop the header row but keep the same column
    // geometry (same generator) — inherit the nearest headered page's column
    // map in both directions. The per-column total reconciliation below
    // still objects loudly if the inherited geometry turns out to be wrong.
    let carry: { bgo: number; amt: number } | null = null
    for (const ctx of pageCtx) {
      if (ctx.cols) carry = ctx.cols
      else ctx.cols = carry
    }
    carry = null
    for (let i = pageCtx.length - 1; i >= 0; i--) {
      if (pageCtx[i]!.cols) carry = pageCtx[i]!.cols
      else pageCtx[i]!.cols = carry
    }
    for (const ctx of pageCtx) {
      for (const it of ctx.items) {
        const key = it.str.trim()
        if (/^A\d{15,20}$/.test(key)) {
          const list = ctx.receiptItems.get(key) ?? []
          list.push(it)
          ctx.receiptItems.set(key, list)
        }
      }
    }

    /** Sale type for a receipt's row: the LEFTMOST numeric cell on the row is
     * the amount (COMM AMT sits far right); classify by nearest column center. */
    function classify(receiptId: string): 'BGO' | 'Table' | null {
      for (const ctx of pageCtx) {
        const list = ctx.receiptItems.get(receiptId)
        if (!list?.length || !ctx.cols) continue
        const anchor = list.shift()!
        const rowNums = ctx.numeric
          .filter(i => Math.abs(i.y - anchor.y) <= 2)
          .sort((a, b) => a.x - b.x)
        const amountItem = rowNums[0]
        if (!amountItem) return null
        const center = amountItem.x + amountItem.w / 2
        return Math.abs(center - ctx.cols.bgo) < Math.abs(center - ctx.cols.amt) ? 'BGO' : 'Table'
      }
      return null
    }

    const rows: ParsedImportRow[] = []
    let unclassified = 0
    let m: RegExpExecArray | null
    C404_ROW.lastIndex = 0
    while ((m = C404_ROW.exec(normalized))) {
      const amount = toNumber(m[8]!)
      if (amount === null) continue
      const date = `${m[3]}-${String(MONTH_NUM[m[2]!]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`
      const saleType = classify(m[5]!)
      if (saleType === null) unclassified++
      rows.push({
        date,
        externalOrderId: m[5]!,
        tableNumber: m[7]!,
        amount,
        saleType: saleType ?? undefined,
        reportedRate: toNumber(m[9]!) ?? undefined,
      })
    }
    if (unclassified > 0) {
      errors.push(`Couldn't locate the BGO/AMT ORD column position for ${unclassified} row(s) — they will import as ${club404AgentParser.defaultSaleType}; verify their types manually.`)
    }

    // The TOTAL line prints one cell per amount column plus the commission
    // total: e.g. 'TOTAL RM - RM 63,736.00 RM 7,010.96' (BGO, AMT ORD, COMM).
    // The last cell is the commission cross-check; the rest sum to the gross.
    let headerTotal: number | null = null
    let reportedCommissionTotal: number | null = null
    let bgoTotal: number | null = null
    let amtTotal: number | null = null
    const totalLine = normalized.match(C404_TOTAL_CELLS)
    if (totalLine) {
      const cells = Array.from(totalLine[1]!.matchAll(/RM\s*(-|[\d,.]+)/g)).map(c => toNumber(c[1]!))
      if (cells.length >= 2) {
        reportedCommissionTotal = cells[cells.length - 1] ?? null
        const grossCells = cells.slice(0, -1)
        headerTotal = grossCells.reduce<number>((a, x) => a + (x ?? 0), 0)
        // Cell order mirrors the column order: BGO SALES then AMT ORD.
        if (grossCells.length === 2) {
          bgoTotal = grossCells[0] ?? null
          amtTotal = grossCells[1] ?? null
        }
      }
    }

    // Per-column reconciliation: if our column classification disagrees with
    // the statement's own per-column totals, say so loudly before commit.
    // Unclassified rows widen the acceptable band instead of disabling the
    // check — a printed total OUTSIDE [classified sum, classified sum +
    // unclassified sum] is provably wrong no matter where the unclassified
    // rows belong, so misclassification can't hide behind one unreadable row.
    const sumCents = (match: (x: ParsedImportRow) => boolean) =>
      rows.reduce((a, x) => a + (match(x) ? Math.round(x.amount * 100) : 0), 0)
    const unclassifiedCents = sumCents(x => x.saleType === undefined)
    const checkColumn = (label: string, type: 'BGO' | 'Table', total: number | null) => {
      if (total === null || rows.length === 0) return
      const lo = sumCents(x => x.saleType === type)
      const totalCents = Math.round(total * 100)
      if (totalCents < lo - 5 || totalCents > lo + unclassifiedCents + 5) {
        const unclassifiedNote = unclassifiedCents > 0 ? ` (plus RM ${(unclassifiedCents / 100).toFixed(2)} unclassified)` : ''
        errors.push(`Statement's ${label} total is RM ${total.toFixed(2)}, but rows classified as ${type} sum to RM ${(lo / 100).toFixed(2)}${unclassifiedNote} — review the column mapping before importing.`)
      }
    }
    checkColumn('BGO SALES', 'BGO', bgoTotal)
    checkColumn('AMT ORD', 'Table', amtTotal)

    rows.sort((a, b) => a.date.localeCompare(b.date) || a.externalOrderId.localeCompare(b.externalOrderId))
    return { ambassadorHint: hint?.[1]?.trim() ?? null, headerTotal, reportedCommissionTotal, rows, errors }
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

export const importParsers: ImportParser[] = [nonoTableParser, club404AgentParser, commissionStatementParser]

const MIN_CONFIDENCE = 0.5

export function detectParser(text: string): { parser: ImportParser; score: number } | null {
  let best: { parser: ImportParser; score: number } | null = null
  for (const parser of importParsers) {
    const score = parser.detect(text)
    if (!best || score > best.score) best = { parser, score }
  }
  return best && best.score >= MIN_CONFIDENCE ? best : null
}
