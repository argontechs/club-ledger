import { extractText, getDocumentProxy } from 'unpdf'
import { detectParser, importParsers } from '~~/server/import/parsers'
import { z } from 'zod'
import { SaleRepo } from '~~/server/repositories/SaleRepository'
import { AmbassadorRepo } from '~~/server/repositories/AmbassadorRepository'
import { RoleRepo } from '~~/server/repositories/RoleRepository'
import { SaleTypeRepo } from '~~/server/repositories/SaleTypeRepository'
import { resolveCommissionRate } from '~~/server/services/RoleService'
import { ApiError } from '~~/server/utils/errors'
import { assertNotOwnerProtected, assertCan, type Actor } from '~~/server/utils/permissions'

export interface ParsedRow {
  date: string
  externalOrderId: string
  tableNumber: string
  amount: number
  reportedRate?: number
}

export interface ParseResult {
  ambassadorHint: string | null
  headerTotal: number
  reportedCommissionTotal: number | null
  rows: ParsedRow[]
  errors: string[]
  /** Which registered statement format matched, and its sale type. */
  format: string
  formatId: string
  suggestedSaleType: string
}

export async function parsePdfBuffer(buf: Buffer): Promise<ParseResult> {
  const pdf = await getDocumentProxy(new Uint8Array(buf))
  const { text: pages } = await extractText(pdf, { mergePages: true })
  const rawText = Array.isArray(pages) ? pages.join('\n') : pages
  const normalized = rawText.replace(/\s+/g, ' ')

  const detected = detectParser(rawText)
  if (!detected) {
    throw ApiError.validation({
      file: `Unrecognised statement format. Supported: ${importParsers.map(p => p.label).join('; ')}`,
    })
  }
  const r = detected.parser.parse(normalized, rawText)
  return {
    ...r,
    format: detected.parser.label,
    formatId: detected.parser.id,
    suggestedSaleType: detected.parser.defaultSaleType,
  }
}

const CommitSchema = z.object({
  status: z.enum(['draft', 'confirmed']).default('draft'),
  saleType: z.string().trim().min(1).max(40).optional(),
  rows: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    externalOrderId: z.string().regex(/^(T\d{15}|A\d{15,20}|M-\d{6}-[A-Za-z0-9]+-\d+)$/),
    tableNumber: z.string(),
    amount: z.number().positive(),
    ambassadorId: z.number().int().positive(),
  })).min(1),
})

export const PDFImportService = {
  async dryRun(clubId: number, buf: Buffer) {
    const r = await parsePdfBuffer(buf)
    const orderIds = r.rows.map(x => x.externalOrderId)
    const dups = await SaleRepo.findByExternalOrderIds(clubId, orderIds)
    const dupSet = new Set(dups.map(d => d.externalOrderId))
    const reportedRates = Array.from(new Set(r.rows.map(x => x.reportedRate).filter((x): x is number => x !== undefined)))
    return {
      format: r.format,
      formatId: r.formatId,
      suggestedSaleType: r.suggestedSaleType,
      ambassadorHint: r.ambassadorHint,
      headerTotal: r.headerTotal,
      reportedCommissionTotal: r.reportedCommissionTotal,
      reportedRates,
      parsedTotal: r.rows.reduce((a, x) => a + x.amount, 0),
      duplicates: Array.from(dupSet),
      rows: r.rows,
    }
  },

  async commit(actor: Actor & { id: number; tier?: string }, clubId: number, body: unknown) {
    assertCan(actor, 'import', 'edit')
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
      if (amb.clubId !== clubId) {
        throw ApiError.validation({ rows: `Ambassador (id=${id}) belongs to a different club` })
      }
      await assertNotOwnerProtected(actor, { kind: 'sale', ambassadorId: id })
      ambassadors.set(id, amb)
    }

    // Rates freeze from each ambassador's role at commit time, mirroring SaleService.confirm
    const rolesById = new Map<number, any>()
    for (const amb of ambassadors.values()) {
      if (rolesById.has(amb.roleId)) continue
      const role = await RoleRepo.findById(amb.roleId)
      if (!role) throw ApiError.validation({ rows: `Ambassador (id=${amb.id}) has an unknown role` })
      rolesById.set(amb.roleId, role)
    }

    // Imported rows take the requested sale type, defaulting to the club's
    // first active type (the POS statement doesn't carry category info).
    const clubTypes = (await SaleTypeRepo.listByClub(clubId)).filter(t => t.isActive === 1)
    if (clubTypes.length === 0) throw ApiError.validation({ saleType: 'This club has no active sale types' })
    const saleType = v.saleType ?? clubTypes[0]!.name
    if (!clubTypes.some(t => t.name === saleType)) {
      throw ApiError.validation({ saleType: 'Unknown sale type for this club' })
    }

    const existing = await SaleRepo.findByExternalOrderIds(clubId, v.rows.map(r => r.externalOrderId))
    const existingSet = new Set(existing.map(e => e.externalOrderId))
    const toInsert = v.rows.filter(r => !existingSet.has(r.externalOrderId))

    if (toInsert.length === 0) return { imported: 0, skipped: v.rows.length }

    const records = toInsert.map(r => {
      const amb = ambassadors.get(r.ambassadorId)!
      const role = rolesById.get(amb.roleId)!
      return {
        date: r.date,
        ambassadorId: r.ambassadorId,
        clubId,
        type: saleType,
        amount: r.amount.toFixed(2),
        notes: null,
        tableNumber: r.tableNumber,
        externalOrderId: r.externalOrderId,
        status: v.status,
        confirmedCommissionRate: v.status === 'confirmed' ? resolveCommissionRate(role, saleType) : null,
        confirmedBonusRate: v.status === 'confirmed' ? role.bonusRate : null,
        confirmedAt: v.status === 'confirmed' ? new Date() : null,
        createdBy: actor.id,
      }
    })

    try {
      await SaleRepo.insertMany(records as any)
    } catch (e: any) {
      // The (club_id, external_order_id) unique index is the backstop against
      // two imports racing past the pre-filter — surface it cleanly.
      if (e?.code === 'ER_DUP_ENTRY' || /Duplicate entry/.test(String(e?.message))) {
        throw ApiError.conflict('Some rows were imported by a concurrent request — run the import again to skip them')
      }
      throw e
    }
    return { imported: toInsert.length, skipped: v.rows.length - toInsert.length }
  },
}
