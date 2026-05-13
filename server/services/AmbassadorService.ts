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

async function assertRoleExists(roleId: number) {
  const r = await RoleRepo.findById(roleId)
  if (!r) throw ApiError.validation({ roleId: 'Unknown role' })
}

export const AmbassadorService = {
  list: AmbassadorRepo.list,

  async get(id: number) {
    const a = await AmbassadorRepo.findById(id)
    if (!a) throw ApiError.notFound('Ambassador')
    return a
  },

  async create(actor: Actor & { tier?: string }, body: unknown) {
    if ((actor as any).tier !== 'admin') {
      throw ApiError.forbidden('Insufficient role')
    }
    const v = parseOrThrow(CreateSchema, body)
    await assertRoleExists(v.roleId)
    const r = await AmbassadorRepo.insert({
      name: v.name,
      fullName: v.fullName ?? null,
      ic: v.ic ?? null,
      teamId: v.teamId ?? null,
      roleId: v.roleId,
      bankName: v.bankName ?? null,
      bankAccountNumber: v.bankAccountNumber ?? null,
      bankOwnerName: v.bankOwnerName ?? null,
    })
    return await AmbassadorRepo.findById((r as any)[0].insertId)
  },

  async update(actor: Actor & { roleName: string; tier?: string }, id: number, body: unknown) {
    if ((actor as any).tier !== 'admin') {
      throw ApiError.forbidden('Insufficient role')
    }
    const a = await this.get(id)
    await assertNotOwnerProtected(actor, { kind: 'ambassador', ambassadorId: id })
    if (a.isProtected && actor.roleName !== 'owner') throw ApiError.forbidden('Protected ambassador')
    const v = parseOrThrow(UpdateSchema, body)
    if (v.roleId !== undefined) await assertRoleExists(v.roleId)

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

  async remove(actor: Actor & { tier?: string }, id: number) {
    if ((actor as any).tier !== 'admin') {
      throw ApiError.forbidden('Insufficient role')
    }
    const a = await this.get(id)
    await assertNotOwnerProtected(actor, { kind: 'ambassador', ambassadorId: id })
    if (a.isProtected) throw ApiError.conflict('Protected ambassador cannot be deleted')
    await AmbassadorRepo.softDelete(id)
  },
}
