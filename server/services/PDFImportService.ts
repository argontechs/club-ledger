import { extractText, getDocumentProxy } from 'unpdf'
import { z } from 'zod'
import { SaleRepo } from '~~/server/repositories/SaleRepository'
import { AmbassadorRepo } from '~~/server/repositories/AmbassadorRepository'
import { SettingsService } from '~~/server/services/SettingsService'
import { ApiError } from '~~/server/utils/errors'
import { assertNotOwnerProtected, type Actor } from '~~/server/utils/permissions'

export interface ParsedRow {
  date: string
  externalOrderId: string
  tableNumber: string
  amount: number
}

export interface ParseResult {
  ambassadorHint: string | null
  headerTotal: number
  rows: ParsedRow[]
  errors: string[]
}

const ROW_RE = /(\d{4}-\d{2}-\d{2})\s+(T\d{15})\s+\S+\s+\S+\s+\S+\s+\S+\s+(\S+)\s+(.+?)\s+\S+\s+RM\s+([\d,.\-]+)\s+RM\s*([\d,.\-]+)/g
// Rows where the POS export omits the order ID (column shows "-") but still has a real amount.
const ORPHAN_ROW_RE = /(\d{4}-\d{2}-\d{2})\s+-\s+(\S+)\s+(.+?)\s+\S+\s+RM\s+([\d,.\-]+)\s+RM\s*([\d,.\-]+)/g
const HEADER_TOTAL_RE = /总计\s+RM\s*([\d,.]+)\s+RM\s*([\d,.]+)/
const HINT_RE = /AGENT COMMISSION ON\s+(.+?)\s+(?:营业|总计|\d{4}-\d{2}-\d{2})/i

function toNumber(rmCell: string): number | null {
  const cleaned = rmCell.replace(/,/g, '').trim()
  if (cleaned === '-' || cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function syntheticOrderId(date: string, tableNumber: string, amount: number): string {
  const ymd = date.replace(/-/g, '').slice(2) // YYMMDD
  const cents = Math.round(amount * 100)
  const safeTable = tableNumber.replace(/[^A-Za-z0-9]/g, '')
  return `M-${ymd}-${safeTable}-${cents}`
}

export async function parsePdfBuffer(buf: Buffer): Promise<ParseResult> {
  const pdf = await getDocumentProxy(new Uint8Array(buf))
  const { text: pages } = await extractText(pdf, { mergePages: true })
  const text = Array.isArray(pages) ? pages.join('\n') : pages
  const errors: string[] = []

  const headerMatch = text.match(HEADER_TOTAL_RE)
  const headerTotal = headerMatch ? Number(headerMatch[1].replace(/,/g, '')) : 0

  const hintMatch = text.match(HINT_RE)
  const ambassadorHint = hintMatch ? hintMatch[1].trim() : null

  const rows: ParsedRow[] = []
  const normalized = text.replace(/\s+/g, ' ')
  let m: RegExpExecArray | null
  ROW_RE.lastIndex = 0
  while ((m = ROW_RE.exec(normalized))) {
    const date = m[1]!, orderId = m[2]!, tableNumber = m[3]!, amountCell = m[5]!
    const amount = toNumber(amountCell)
    if (amount === null) continue
    rows.push({ date, externalOrderId: orderId, tableNumber, amount })
  }

  ORPHAN_ROW_RE.lastIndex = 0
  while ((m = ORPHAN_ROW_RE.exec(normalized))) {
    const date = m[1]!, tableNumber = m[2]!, amountCell = m[4]!
    const amount = toNumber(amountCell)
    if (amount === null) continue
    rows.push({ date, externalOrderId: syntheticOrderId(date, tableNumber, amount), tableNumber, amount })
  }

  rows.sort((a, b) => a.date.localeCompare(b.date) || a.externalOrderId.localeCompare(b.externalOrderId))

  return { ambassadorHint, headerTotal, rows, errors }
}

const CommitSchema = z.object({
  status: z.enum(['draft', 'confirmed']).default('draft'),
  rows: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    externalOrderId: z.string().regex(/^(T\d{15}|M-\d{6}-[A-Za-z0-9]+-\d+)$/),
    tableNumber: z.string(),
    amount: z.number().positive(),
    ambassadorId: z.number().int().positive(),
  })).min(1),
})

export const PDFImportService = {
  async dryRun(buf: Buffer) {
    const r = await parsePdfBuffer(buf)
    const orderIds = r.rows.map(x => x.externalOrderId)
    const dups = await SaleRepo.findByExternalOrderIds(orderIds)
    const dupSet = new Set(dups.map(d => d.externalOrderId))
    return {
      ambassadorHint: r.ambassadorHint,
      headerTotal: r.headerTotal,
      parsedTotal: r.rows.reduce((a, x) => a + x.amount, 0),
      duplicates: Array.from(dupSet),
      rows: r.rows,
    }
  },

  async commit(actor: Actor & { id: number }, body: unknown) {
    const parsed = CommitSchema.safeParse(body)
    if (!parsed.success) {
      const issues = parsed.error.issues
      const first = issues[0]
      const path = first?.path?.join('.') || 'body'
      throw ApiError.validation({ [path]: first?.message || 'Invalid input' })
    }
    const v = parsed.data

    // Validate every ambassador exists and isn't owner-protected for the actor
    const uniqueIds = Array.from(new Set(v.rows.map(r => r.ambassadorId)))
    const ambassadors = new Map<number, any>()
    for (const id of uniqueIds) {
      const amb = await AmbassadorRepo.findById(id)
      if (!amb || amb.deletedAt) {
        throw ApiError.validation({ rows: `Unknown ambassador (id=${id})` })
      }
      await assertNotOwnerProtected(actor, { kind: 'sale', ambassadorId: id })
      ambassadors.set(id, amb)
    }

    const existing = await SaleRepo.findByExternalOrderIds(v.rows.map(r => r.externalOrderId))
    const existingSet = new Set(existing.map(e => e.externalOrderId))
    const toInsert = v.rows.filter(r => !existingSet.has(r.externalOrderId))

    if (toInsert.length === 0) return { imported: 0, skipped: v.rows.length }

    const bonusRate = await SettingsService.get('bonus_rate')

    const records = toInsert.map(r => {
      const amb = ambassadors.get(r.ambassadorId)!
      return {
        date: r.date,
        ambassadorId: r.ambassadorId,
        type: 'Table' as const,
        amount: r.amount.toFixed(2),
        notes: null,
        tableNumber: r.tableNumber,
        externalOrderId: r.externalOrderId,
        status: v.status,
        confirmedCommissionRate: v.status === 'confirmed' ? amb.commissionRate : null,
        confirmedBonusRate: v.status === 'confirmed' ? bonusRate : null,
        confirmedAt: v.status === 'confirmed' ? new Date() : null,
        createdBy: actor.id,
      }
    })

    await SaleRepo.insertMany(records as any)
    return { imported: toInsert.length, skipped: v.rows.length - toInsert.length }
  },
}
