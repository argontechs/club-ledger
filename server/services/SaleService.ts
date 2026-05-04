import { z } from 'zod'
import { SaleRepo } from '~~/server/repositories/SaleRepository'
import { AmbassadorRepo } from '~~/server/repositories/AmbassadorRepository'
import { SettingsService } from '~~/server/services/SettingsService'
import { ApiError } from '~~/server/utils/errors'
import { assertNotOwnerProtected, type Actor } from '~~/server/utils/permissions'

const CreateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ambassadorId: z.number().int().positive(),
  type: z.enum(['Table', 'BGO']),
  amount: z.number().nonnegative(),
  notes: z.string().nullish(),
  tableNumber: z.string().min(1, 'Table number is required'),
  externalOrderId: z.string().nullish(),
})

const UpdateSchema = CreateSchema.partial()

export const SaleService = {
  list: SaleRepo.list,

  async get(id: number) {
    const s = await SaleRepo.findById(id)
    if (!s) throw ApiError.notFound('Sale')
    return s
  },

  async create(actor: Actor & { id: number; roleName: string }, body: unknown) {
    if (actor.roleName !== 'owner' && actor.roleName !== 'admin') {
      throw ApiError.forbidden('Insufficient role')
    }
    const v = CreateSchema.parse(body)
    const amb = await AmbassadorRepo.findById(v.ambassadorId)
    if (!amb || amb.deletedAt) throw ApiError.validation({ ambassadorId: 'Unknown ambassador' })
    await assertNotOwnerProtected(actor, { kind: 'sale', ambassadorId: v.ambassadorId })
    const r = await SaleRepo.insert({
      date: v.date, ambassadorId: v.ambassadorId, type: v.type,
      amount: v.amount.toFixed(2), notes: v.notes ?? null,
      tableNumber: v.tableNumber ?? null, externalOrderId: v.externalOrderId ?? null,
      status: 'draft', createdBy: actor.id,
    })
    return await SaleRepo.findById((r as any)[0].insertId)
  },

  async update(actor: Actor & { roleName: string }, id: number, body: unknown) {
    if (actor.roleName !== 'owner' && actor.roleName !== 'admin') {
      throw ApiError.forbidden('Insufficient role')
    }
    const s = await this.get(id)
    if (s.status !== 'draft') throw ApiError.conflict('Only draft sales can be edited')
    await assertNotOwnerProtected(actor, { kind: 'sale', ambassadorId: s.ambassadorId })
    const v = UpdateSchema.parse(body)
    const patch: Record<string, unknown> = {}
    if (v.date) patch.date = v.date
    if (v.ambassadorId) patch.ambassadorId = v.ambassadorId
    if (v.type) patch.type = v.type
    if (v.amount !== undefined) patch.amount = v.amount.toFixed(2)
    if (v.notes !== undefined) patch.notes = v.notes
    if (v.tableNumber !== undefined) patch.tableNumber = v.tableNumber
    await SaleRepo.update(id, patch)
    return await this.get(id)
  },

  async confirm(actor: Actor & { roleName: string }, id: number) {
    if (actor.roleName !== 'owner' && actor.roleName !== 'admin') {
      throw ApiError.forbidden('Insufficient role')
    }
    const s = await this.get(id)
    if (s.status !== 'draft') throw ApiError.conflict('Only draft sales can be confirmed')
    await assertNotOwnerProtected(actor, { kind: 'sale', ambassadorId: s.ambassadorId })
    const amb = await AmbassadorRepo.findById(s.ambassadorId)
    if (!amb) throw ApiError.notFound('Ambassador')
    const bonusRate = await SettingsService.get('bonus_rate')
    await SaleRepo.update(id, {
      status: 'confirmed',
      confirmedCommissionRate: amb.commissionRate,
      confirmedBonusRate: bonusRate,
      confirmedAt: new Date(),
    } as any)
    return await this.get(id)
  },

  async void(actor: Actor & { roleName: string }, id: number) {
    if (actor.roleName !== 'owner' && actor.roleName !== 'admin') {
      throw ApiError.forbidden('Insufficient role')
    }
    const s = await this.get(id)
    if (s.status === 'voided') return s
    await assertNotOwnerProtected(actor, { kind: 'sale', ambassadorId: s.ambassadorId })
    await SaleRepo.update(id, { status: 'voided', voidedAt: new Date() } as any)
    return await this.get(id)
  },

  async confirmDrafts(actor: Actor, filter: { ambassadorId?: number; month?: string }) {
    const all = await SaleRepo.list({ ...filter, status: 'draft' })
    let confirmed = 0
    let failed = 0
    for (const s of all) {
      try {
        await this.confirm(actor, s.id)
        confirmed++
      } catch {
        failed++
      }
    }
    return { confirmed, failed, total: all.length }
  },
}
