import { z } from 'zod'
import { ClubRepo } from '~~/server/repositories/ClubRepository'
import { RoleRepo } from '~~/server/repositories/RoleRepository'
import { SaleTypeRepo } from '~~/server/repositories/SaleTypeRepository'
import { ApiError } from '~~/server/utils/errors'
import type { Actor } from '~~/server/utils/permissions'

const NameSchema = z.object({ name: z.string().min(1).max(120) })

function assertAdminTier(actor: Actor & { tier?: string }) {
  if ((actor as any).tier !== 'admin') {
    throw ApiError.forbidden('Insufficient role')
  }
}

// Every new club starts with editable commission-role scaffolding so the
// roles page is never empty and ambassadors can be created immediately.
const DEFAULT_CLUB_ROLES = [
  { name: 'Leader', tier: 'ambassador' as const, baseRate: '8.00' },
  { name: 'Ambassador', tier: 'ambassador' as const, baseRate: '8.00' },
]

export const ClubService = {
  async list(_actor: Actor) {
    return ClubRepo.list()
  },

  async create(actor: Actor & { tier?: string }, body: unknown) {
    assertAdminTier(actor)
    const v = NameSchema.parse(body)
    const r = await ClubRepo.insert({ name: v.name })
    const clubId = (r as any)[0].insertId as number
    for (const role of DEFAULT_CLUB_ROLES) {
      await RoleRepo.insert({
        name: role.name, tier: role.tier, baseRate: role.baseRate,
        bonusRate: null, kpiThreshold: null, requiresKpi: 0, clubId,
      })
    }
    await SaleTypeRepo.insert({ clubId, name: 'Table', sortOrder: 0 })
    await SaleTypeRepo.insert({ clubId, name: 'BGO', sortOrder: 1 })
    return ClubRepo.findById(clubId)
  },

  async update(actor: Actor & { tier?: string }, id: number, body: unknown) {
    assertAdminTier(actor)
    const club = await ClubRepo.findById(id)
    if (!club || club.deletedAt) throw ApiError.notFound('Club')
    const v = NameSchema.partial().parse(body)
    await ClubRepo.update(id, v)
    return ClubRepo.findById(id)
  },

  async remove(actor: Actor & { tier?: string }, id: number) {
    assertAdminTier(actor)
    const club = await ClubRepo.findById(id)
    if (!club || club.deletedAt) throw ApiError.notFound('Club')
    const all = await ClubRepo.list()
    if (all.length <= 1) throw ApiError.conflict('Cannot delete the only club')
    const rows = await ClubRepo.countScopedRows(id)
    if (rows > 0) throw ApiError.conflict('Club still has teams, ambassadors, sales or payouts')
    await ClubRepo.softDelete(id)
  },
}
