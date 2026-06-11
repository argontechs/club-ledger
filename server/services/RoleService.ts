import { z } from 'zod'
import { RoleRepo } from '~~/server/repositories/RoleRepository'
import { ApiError } from '~~/server/utils/errors'
import type { Actor } from '~~/server/utils/permissions'

const PayloadSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(40),
  tier: z.enum(['admin', 'ambassador']),
  baseRate: z.number().min(0).max(100),
  bonusRate: z.number().min(0).max(100).nullable(),
  requiresKpi: z.boolean(),
  kpiThreshold: z.number().min(0).nullable(),
})
export type RolePayload = z.infer<typeof PayloadSchema>

function toSnake(s: string): string {
  return s.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase())
}

export function validateRolePayload(input: unknown): RolePayload {
  const parsed = PayloadSchema.safeParse(input)
  if (!parsed.success) {
    const details: Record<string, string> = {}
    for (const i of parsed.error.issues) {
      const key = i.path.map((p) => (typeof p === 'string' ? toSnake(p) : String(p))).join('.')
      details[key] = i.message
    }
    throw ApiError.validation(details)
  }
  const v = parsed.data

  if (v.tier === 'admin') {
    return { ...v, requiresKpi: false, kpiThreshold: null }
  }
  if (v.requiresKpi && (v.kpiThreshold === null || v.kpiThreshold <= 0)) {
    throw ApiError.validation({ kpi_threshold: 'kpi_threshold required when requires_kpi is true' })
  }
  if (v.kpiThreshold !== null && (v.bonusRate === null || v.bonusRate <= 0)) {
    throw ApiError.validation({ bonus_rate: 'bonus_rate required when kpi_threshold is set' })
  }
  return v
}

export const RoleService = {
  // Commission roles of the active club — what the roles page manages.
  listForClub(clubId: number) {
    return RoleRepo.listByClub(clubId)
  },

  // Company-level staff roles — what the access page assigns to logins.
  listStaff() {
    return RoleRepo.listStaff()
  },

  async get(id: number) {
    const r = await RoleRepo.findById(id)
    if (!r) throw ApiError.notFound('Role')
    return r
  },

  async create(actor: Actor & { roleName: string; tier?: string }, clubId: number, body: unknown) {
    if ((actor as any).tier !== 'admin') {
      throw ApiError.forbidden('Insufficient role')
    }
    const v = validateRolePayload(body)

    if (v.tier === 'admin' && !(actor as any).isOwner) {
      throw ApiError.forbidden('Only the owner can create admin-tier roles')
    }
    const clubRoles = await RoleRepo.listByClub(clubId)
    if (clubRoles.some(r => r.name === v.name)) {
      throw ApiError.conflict('A role with that name already exists in this club')
    }

    const r = await RoleRepo.insert({
      name: v.name, tier: v.tier,
      baseRate: v.baseRate.toFixed(2),
      bonusRate: v.bonusRate === null ? null : v.bonusRate.toFixed(2),
      kpiThreshold: v.kpiThreshold === null ? null : v.kpiThreshold.toFixed(2),
      requiresKpi: v.requiresKpi ? 1 : 0,
      clubId,
    })
    return await RoleRepo.findById((r as any)[0].insertId)
  },

  async update(actor: Actor & { roleName: string; tier?: string }, clubId: number, id: number, body: unknown) {
    if ((actor as any).tier !== 'admin') {
      throw ApiError.forbidden('Insufficient role')
    }
    const existing = await this.get(id)
    if (existing.clubId === null) {
      throw ApiError.forbidden('Staff roles are not managed here')
    }
    if (existing.clubId !== clubId) throw ApiError.notFound('Role')
    const v = validateRolePayload(body)

    if (existing.isSystem) {
      if (v.name !== existing.name) {
        throw ApiError.validation({ name: 'System role name cannot be changed' })
      }
      if (v.tier !== existing.tier) {
        throw ApiError.validation({ tier: 'System role tier cannot be changed' })
      }
    }
    if (v.tier === 'admin' && existing.tier !== 'admin' && !(actor as any).isOwner) {
      throw ApiError.forbidden('Only the owner can promote a role to admin tier')
    }
    if (v.name !== existing.name) {
      const clubRoles = await RoleRepo.listByClub(existing.clubId)
      if (clubRoles.some(r => r.name === v.name && r.id !== id)) {
        throw ApiError.conflict('A role with that name already exists in this club')
      }
    }

    await RoleRepo.update(id, {
      name: v.name, tier: v.tier,
      baseRate: v.baseRate.toFixed(2),
      bonusRate: v.bonusRate === null ? null : v.bonusRate.toFixed(2),
      kpiThreshold: v.kpiThreshold === null ? null : v.kpiThreshold.toFixed(2),
      requiresKpi: v.requiresKpi ? 1 : 0,
    })
    return await this.get(id)
  },

  async remove(actor: Actor & { tier?: string }, clubId: number, id: number) {
    if ((actor as any).tier !== 'admin') {
      throw ApiError.forbidden('Insufficient role')
    }
    const existing = await this.get(id)
    if (existing.clubId === null) {
      throw ApiError.forbidden('Staff roles are not managed here')
    }
    if (existing.clubId !== clubId) throw ApiError.notFound('Role')
    if (existing.isSystem) throw ApiError.conflict('System roles cannot be deleted')
    const inUse = (await RoleRepo.countAmbassadorsUsing(id)) + (await RoleRepo.countUsersUsing(id))
    if (inUse > 0) throw ApiError.conflict(`Role is in use by ${inUse} record(s)`)
    await RoleRepo.delete(id)
  },
}
