import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'
import { SaleRepo } from '~~/server/repositories/SaleRepository'
import { AmbassadorRepo } from '~~/server/repositories/AmbassadorRepository'
import { SaleTypeService } from '~~/server/services/SaleTypeService'
import { resolveCommissionRate } from '~~/server/services/RoleService'
import { ApiError } from '~~/server/utils/errors'
import { assertNotOwnerProtected, assertCan, type Actor } from '~~/server/utils/permissions'

const CreateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ambassadorId: z.number().int().positive(),
  type: z.string().trim().min(1).max(40),
  amount: z.number().nonnegative(),
  notes: z.string().nullish(),
  tableNumber: z.string().min(1, 'Table number is required'),
  externalOrderId: z.string().nullish(),
})

const UpdateSchema = CreateSchema.partial()

export const SaleService = {
  list: SaleRepo.list,

  // clubId (when provided) asserts ownership — records from other clubs are
  // indistinguishable from missing ones (404, not 403, to avoid id probing).
  async get(id: number, clubId?: number) {
    const s = await SaleRepo.findById(id)
    if (!s || (clubId !== undefined && s.clubId !== clubId)) throw ApiError.notFound('Sale')
    return s
  },

  async create(actor: Actor & { id: number; roleName: string; tier?: string }, clubId: number, body: unknown) {
    assertCan(actor, 'sales', 'edit')
    const v = CreateSchema.parse(body)
    const amb = await AmbassadorRepo.findById(v.ambassadorId)
    if (!amb || amb.deletedAt) throw ApiError.validation({ ambassadorId: 'Unknown ambassador' })
    if (amb.clubId !== clubId) throw ApiError.validation({ ambassadorId: 'Ambassador belongs to a different club' })
    const types = await SaleTypeService.activeNames(clubId)
    if (!types.has(v.type)) throw ApiError.validation({ type: 'Unknown sale type for this club' })
    await assertNotOwnerProtected(actor, { kind: 'sale', ambassadorId: v.ambassadorId })
    const r = await SaleRepo.insert({
      date: v.date, ambassadorId: v.ambassadorId, clubId, type: v.type,
      amount: v.amount.toFixed(2), notes: v.notes ?? null,
      tableNumber: v.tableNumber ?? null, externalOrderId: v.externalOrderId ?? null,
      status: 'draft', createdBy: actor.id,
    })
    return await SaleRepo.findById((r as any)[0].insertId)
  },

  async update(actor: Actor & { roleName: string; tier?: string }, clubId: number, id: number, body: unknown) {
    assertCan(actor, 'sales', 'edit')
    const s = await this.get(id, clubId)
    if (s.status !== 'draft') throw ApiError.conflict('Only draft sales can be edited')
    await assertNotOwnerProtected(actor, { kind: 'sale', ambassadorId: s.ambassadorId })
    const v = UpdateSchema.parse(body)
    if (v.type !== undefined) {
      const types = await SaleTypeService.activeNames(clubId)
      if (!types.has(v.type)) throw ApiError.validation({ type: 'Unknown sale type for this club' })
    }
    const patch: Record<string, unknown> = {}
    if (v.date) patch.date = v.date
    if (v.ambassadorId) {
      const amb = await AmbassadorRepo.findById(v.ambassadorId)
      if (!amb || amb.deletedAt) throw ApiError.validation({ ambassadorId: 'Unknown ambassador' })
      if (amb.clubId !== s.clubId) throw ApiError.validation({ ambassadorId: 'Ambassador belongs to a different club' })
      patch.ambassadorId = v.ambassadorId
    }
    if (v.type) patch.type = v.type
    if (v.amount !== undefined) patch.amount = v.amount.toFixed(2)
    if (v.notes !== undefined) patch.notes = v.notes
    if (v.tableNumber !== undefined) patch.tableNumber = v.tableNumber
    await SaleRepo.update(id, patch)
    return await this.get(id)
  },

  async confirm(actor: Actor & { roleName: string; tier?: string }, clubId: number, id: number) {
    assertCan(actor, 'sales', 'edit')
    const s = await this.get(id, clubId)
    if (s.status !== 'draft') throw ApiError.conflict('Only draft sales can be confirmed')
    await assertNotOwnerProtected(actor, { kind: 'sale', ambassadorId: s.ambassadorId })
    const amb = await AmbassadorRepo.findById(s.ambassadorId)
    if (!amb) throw ApiError.notFound('Ambassador')
    const role = (await useDB().select().from(schema.roles).where(eq(schema.roles.id, amb.roleId)).limit(1))[0]
    if (!role) throw ApiError.notFound('Role')
    await SaleRepo.update(id, {
      status: 'confirmed',
      confirmedCommissionRate: resolveCommissionRate(role, s.type),
      confirmedBonusRate: role.bonusRate,
      confirmedAt: new Date(),
    } as any)
    return await this.get(id)
  },

  async void(actor: Actor & { roleName: string; tier?: string }, clubId: number, id: number) {
    assertCan(actor, 'sales', 'edit')
    const s = await this.get(id, clubId)
    if (s.status === 'voided') return s
    await assertNotOwnerProtected(actor, { kind: 'sale', ambassadorId: s.ambassadorId })
    await SaleRepo.update(id, { status: 'voided', voidedAt: new Date() } as any)
    return await this.get(id)
  },

  async confirmDrafts(actor: Actor, filter: { clubId: number; ambassadorId?: number; month?: string }) {
    const all = await SaleRepo.list({ ...filter, status: 'draft' })
    let confirmed = 0
    let failed = 0
    for (const s of all) {
      try {
        await this.confirm(actor, filter.clubId, s.id)
        confirmed++
      } catch {
        failed++
      }
    }
    return { confirmed, failed, total: all.length }
  },
}
