import { z } from 'zod'
import { AmbassadorRepo } from '~~/server/repositories/AmbassadorRepository'
import { RoleRepo } from '~~/server/repositories/RoleRepository'
import { ApiError } from '~~/server/utils/errors'
import { assertNotOwnerProtected, type Actor } from '~~/server/utils/permissions'

const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  fullName: z.string().max(200).nullish(),
  ic: z.string().max(60).nullish(),
  teamId: z.number().int().nullish(),
  roleId: z.number().int().positive(),
  bankName: z.string().max(120).nullish(),
  bankAccountNumber: z.string().max(60).nullish(),
  bankOwnerName: z.string().max(200).nullish(),
})

const UpdateSchema = CreateSchema.partial()

function parseOrThrow<T>(s: z.ZodSchema<T>, body: unknown): T {
  const r = s.safeParse(body)
  if (!r.success) {
    const details: Record<string, string> = {}
    for (const i of r.error.issues) details[i.path.join('.')] = i.message
    throw ApiError.validation(details)
  }
  return r.data
}

// Ambassadors carry commission roles, which are club-scoped — the role must
// belong to the same club as the ambassador.
async function assertClubRole(roleId: number, clubId: number) {
  const r = await RoleRepo.findById(roleId)
  if (!r || r.clubId !== clubId) throw ApiError.validation({ roleId: 'Unknown role for this club' })
}

// PII guard: IC and bank details are admin-tier-only. Pages visible to
// ambassador-tier logins (sales, commissions) only need names for dropdowns.
function toSafe(a: any) {
  return { id: a.id, name: a.name, teamId: a.teamId, roleId: a.roleId }
}

export const AmbassadorService = {
  async list(actor: Actor & { tier?: string }, filter: { clubId?: number; teamId?: number; includeDeleted?: boolean } = {}) {
    const rows = await AmbassadorRepo.list(filter)
    return (actor as any).tier === 'admin' ? rows : rows.map(toSafe)
  },

  async get(id: number, actor?: Actor & { tier?: string }, clubId?: number) {
    const a = await AmbassadorRepo.findById(id)
    if (!a || (clubId !== undefined && a.clubId !== clubId)) throw ApiError.notFound('Ambassador')
    if (actor && (actor as any).tier !== 'admin') return toSafe(a)
    return a
  },

  async create(actor: Actor & { tier?: string }, clubId: number, body: unknown) {
    if ((actor as any).tier !== 'admin') {
      throw ApiError.forbidden('Insufficient role')
    }
    const v = parseOrThrow(CreateSchema, body)
    await assertClubRole(v.roleId, clubId)
    const r = await AmbassadorRepo.insert({
      name: v.name,
      fullName: v.fullName ?? null,
      ic: v.ic ?? null,
      teamId: v.teamId ?? null,
      roleId: v.roleId,
      clubId,
      bankName: v.bankName ?? null,
      bankAccountNumber: v.bankAccountNumber ?? null,
      bankOwnerName: v.bankOwnerName ?? null,
    })
    return await AmbassadorRepo.findById((r as any)[0].insertId)
  },

  // Cross-club import: copies identity + bank details into the current club.
  // Copies are independent records — each club's ledger stays self-contained.
  async importFromClub(actor: Actor & { tier?: string }, clubId: number, body: unknown) {
    if ((actor as any).tier !== 'admin') {
      throw ApiError.forbidden('Insufficient role')
    }
    const v = parseOrThrow(z.object({
      sourceAmbassadorIds: z.array(z.number().int().positive()).min(1).max(100),
      roleId: z.number().int().positive(),
    }), body)
    await assertClubRole(v.roleId, clubId)
    const created: any[] = []
    let skipped = 0
    // Server-side dedupe: re-imports (double-submit, retries) are skipped, not duplicated.
    const existing = await AmbassadorRepo.list({ clubId })
    const existingIcs = new Set(existing.map((a: any) => a.ic).filter(Boolean))
    const existingNames = new Set(existing.map((a: any) => a.name))
    for (const id of v.sourceAmbassadorIds) {
      const src = await AmbassadorRepo.findById(id)
      if (!src || src.deletedAt) throw ApiError.validation({ sourceAmbassadorIds: `Unknown ambassador (id=${id})` })
      if (src.clubId === clubId) throw ApiError.validation({ sourceAmbassadorIds: `Ambassador (id=${id}) is already in this club` })
      if ((src.ic && existingIcs.has(src.ic)) || (!src.ic && existingNames.has(src.name))) {
        skipped++
        continue
      }
      const r = await AmbassadorRepo.insert({
        name: src.name,
        fullName: src.fullName,
        ic: src.ic,
        teamId: null,
        roleId: v.roleId,
        clubId,
        bankName: src.bankName,
        bankAccountNumber: src.bankAccountNumber,
        bankOwnerName: src.bankOwnerName,
      })
      const row = await AmbassadorRepo.findById((r as any)[0].insertId)
      if (row) {
        created.push(row)
        if (row.ic) existingIcs.add(row.ic)
        existingNames.add(row.name)
      }
    }
    return { created: created.length, skipped, items: created }
  },

  async update(actor: Actor & { roleName: string; tier?: string }, clubId: number, id: number, body: unknown) {
    if ((actor as any).tier !== 'admin') {
      throw ApiError.forbidden('Insufficient role')
    }
    const a = await AmbassadorRepo.findById(id)
    if (!a || a.clubId !== clubId) throw ApiError.notFound('Ambassador')
    await assertNotOwnerProtected(actor, { kind: 'ambassador', ambassadorId: id })
    if (a.isProtected && actor.roleName !== 'owner') throw ApiError.forbidden('Protected ambassador')
    const v = parseOrThrow(UpdateSchema, body)
    if (v.roleId !== undefined) await assertClubRole(v.roleId, a.clubId)

    const patch: Record<string, unknown> = {}
    if (v.name !== undefined) patch.name = v.name
    if (v.fullName !== undefined) patch.fullName = v.fullName ?? null
    if (v.ic !== undefined) patch.ic = v.ic ?? null
    if (v.teamId !== undefined) patch.teamId = v.teamId
    if (v.roleId !== undefined) patch.roleId = v.roleId
    if (v.bankName !== undefined) patch.bankName = v.bankName ?? null
    if (v.bankAccountNumber !== undefined) patch.bankAccountNumber = v.bankAccountNumber ?? null
    if (v.bankOwnerName !== undefined) patch.bankOwnerName = v.bankOwnerName ?? null
    await AmbassadorRepo.update(id, patch)
    return await this.get(id)
  },

  async remove(actor: Actor & { tier?: string }, clubId: number, id: number) {
    if ((actor as any).tier !== 'admin') {
      throw ApiError.forbidden('Insufficient role')
    }
    const a = await AmbassadorRepo.findById(id)
    if (!a || a.clubId !== clubId) throw ApiError.notFound('Ambassador')
    await assertNotOwnerProtected(actor, { kind: 'ambassador', ambassadorId: id })
    if (a.isProtected) throw ApiError.conflict('Protected ambassador cannot be deleted')
    await AmbassadorRepo.softDelete(id)
  },
}
