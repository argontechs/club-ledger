import { PDFParse } from 'pdf-parse'
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
const HEADER_TOTAL_RE = /总计\s+RM\s*([\d,.]+)\s+RM\s*([\d,.]+)/
const HINT_RE = /AGENT COMMISSION ON\s*\n\s*([^\n]+)/i

function toNumber(rmCell: string): number | null {
  const cleaned = rmCell.replace(/,/g, '').trim()
  if (cleaned === '-' || cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

export async function parsePdfBuffer(buf: Buffer): Promise<ParseResult> {
  const parser = new PDFParse({ data: buf })
  const parsed = await parser.getText()
  await parser.destroy()
  const text = parsed.text
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
    const [, date, orderId, tableNumber, , amountCell] = m
    const amount = toNumber(amountCell)
    if (amount === null) continue
    rows.push({ date, externalOrderId: orderId, tableNumber, amount })
  }

  return { ambassadorHint, headerTotal, rows, errors }
}

const CommitSchema = z.object({
  ambassadorId: z.number().int().positive(),
  status: z.enum(['draft', 'confirmed']).default('draft'),
  rows: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    externalOrderId: z.string().regex(/^T\d{15}$/),
    tableNumber: z.string(),
    amount: z.number().positive(),
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
    const v = CommitSchema.parse(body)
    const amb = await AmbassadorRepo.findById(v.ambassadorId)
    if (!amb || amb.deletedAt) throw ApiError.validation({ ambassadorId: 'Unknown ambassador' })
    await assertNotOwnerProtected(actor, { kind: 'sale', ambassadorId: v.ambassadorId })

    const existing = await SaleRepo.findByExternalOrderIds(v.rows.map(r => r.externalOrderId))
    const existingSet = new Set(existing.map(e => e.externalOrderId))
    const toInsert = v.rows.filter(r => !existingSet.has(r.externalOrderId))

    if (toInsert.length === 0) return { imported: 0, skipped: v.rows.length }

    const bonusRate = await SettingsService.get('bonus_rate')
    const commissionRate = amb.commissionRate

    const records = toInsert.map(r => ({
      date: r.date,
      ambassadorId: v.ambassadorId,
      type: 'Table' as const,
      amount: r.amount.toFixed(2),
      notes: null,
      tableNumber: r.tableNumber,
      externalOrderId: r.externalOrderId,
      status: v.status,
      confirmedCommissionRate: v.status === 'confirmed' ? commissionRate : null,
      confirmedBonusRate: v.status === 'confirmed' ? bonusRate : null,
      confirmedAt: v.status === 'confirmed' ? new Date() : null,
      createdBy: actor.id,
    }))

    await SaleRepo.insertMany(records as any)
    return { imported: toInsert.length, skipped: v.rows.length - toInsert.length }
  },
}
