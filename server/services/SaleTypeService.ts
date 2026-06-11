import { z } from 'zod'
import { SaleTypeRepo } from '~~/server/repositories/SaleTypeRepository'
import { ApiError } from '~~/server/utils/errors'
import { assertCan, type Actor } from '~~/server/utils/permissions'

const NameSchema = z.object({
  name: z.string().trim().min(1).max(40),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

function assertAdminTier(actor: Actor & { tier?: string }) {
  assertCan(actor, 'sales', 'edit')
}

export const SaleTypeService = {
  list(clubId: number) {
    return SaleTypeRepo.listByClub(clubId)
  },

  // Active type names for validating sale writes.
  async activeNames(clubId: number): Promise<Set<string>> {
    const rows = await SaleTypeRepo.listByClub(clubId)
    return new Set(rows.filter(r => r.isActive === 1).map(r => r.name))
  },

  async create(actor: Actor & { tier?: string }, clubId: number, body: unknown) {
    assertAdminTier(actor)
    const v = NameSchema.parse(body)
    const existing = await SaleTypeRepo.listByClub(clubId)
    if (existing.some(t => t.name === v.name)) {
      throw ApiError.conflict('A sale type with that name already exists in this club')
    }
    const r = await SaleTypeRepo.insert({ clubId, name: v.name, sortOrder: v.sortOrder ?? existing.length })
    return SaleTypeRepo.findById((r as any)[0].insertId)
  },

  async update(actor: Actor & { tier?: string }, clubId: number, id: number, body: unknown) {
    assertAdminTier(actor)
    const t = await SaleTypeRepo.findById(id)
    if (!t || t.clubId !== clubId) throw ApiError.notFound('Sale type')
    const v = NameSchema.partial().parse(body)
    if (v.name && v.name !== t.name) {
      const existing = await SaleTypeRepo.listByClub(clubId)
      if (existing.some(x => x.name === v.name && x.id !== id)) {
        throw ApiError.conflict('A sale type with that name already exists in this club')
      }
    }
    if (v.isActive === false && t.isActive === 1) {
      const active = (await SaleTypeRepo.listByClub(clubId)).filter(x => x.isActive === 1)
      if (active.length <= 1) {
        throw ApiError.conflict('A club needs at least one active sale type')
      }
    }
    await SaleTypeRepo.update(id, {
      ...(v.name !== undefined ? { name: v.name } : {}),
      ...(v.sortOrder !== undefined ? { sortOrder: v.sortOrder } : {}),
      ...(v.isActive !== undefined ? { isActive: v.isActive ? 1 : 0 } : {}),
    })
    return SaleTypeRepo.findById(id)
  },

  async remove(actor: Actor & { tier?: string }, clubId: number, id: number) {
    assertAdminTier(actor)
    const t = await SaleTypeRepo.findById(id)
    if (!t || t.clubId !== clubId) throw ApiError.notFound('Sale type')
    const active = (await SaleTypeRepo.listByClub(clubId)).filter(x => x.isActive === 1)
    if (active.length <= 1 && active[0]?.id === id) {
      throw ApiError.conflict('A club needs at least one active sale type')
    }
    // Historical sales keep their snapshotted type name — deletion only
    // removes the option from the pick-list.
    await SaleTypeRepo.delete(id)
  },
}
