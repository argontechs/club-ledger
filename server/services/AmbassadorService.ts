import { z } from 'zod'
import { AmbassadorRepo } from '~~/server/repositories/AmbassadorRepository'
import { ApiError } from '~~/server/utils/errors'
import { assertNotOwnerProtected, type Actor } from '~~/server/utils/permissions'

const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  fullName: z.string().max(200).nullish(),
  ic: z.string().max(60).nullish(),
  teamId: z.number().int().nullish(),
  commissionRate: z.number().min(0).max(100).default(8),
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

export const AmbassadorService = {
  list: AmbassadorRepo.list,

  async get(id: number) {
    const a = await AmbassadorRepo.findById(id)
    if (!a) throw ApiError.notFound('Ambassador')
    return a
  },

  async create(actor: Actor, body: unknown) {
    const v = parseOrThrow(CreateSchema, body)
    const r = await AmbassadorRepo.insert({
      name: v.name,
      fullName: v.fullName ?? null,
      ic: v.ic ?? null,
      teamId: v.teamId ?? null,
      commissionRate: v.commissionRate.toFixed(2),
      bankName: v.bankName ?? null,
      bankAccountNumber: v.bankAccountNumber ?? null,
      bankOwnerName: v.bankOwnerName ?? null,
    })
    return await AmbassadorRepo.findById((r as any)[0].insertId)
  },

  async update(actor: Actor, id: number, body: unknown) {
    const a = await this.get(id)
    await assertNotOwnerProtected(actor, { kind: 'ambassador', ambassadorId: id })
    if (a.isProtected && actor.roleName !== 'owner') throw ApiError.forbidden('Protected ambassador')
    const v = parseOrThrow(UpdateSchema, body)
    const patch: Record<string, unknown> = {}
    if (v.name !== undefined) patch.name = v.name
    if (v.fullName !== undefined) patch.fullName = v.fullName ?? null
    if (v.ic !== undefined) patch.ic = v.ic ?? null
    if (v.teamId !== undefined) patch.teamId = v.teamId
    if (v.commissionRate !== undefined) patch.commissionRate = v.commissionRate.toFixed(2)
    if (v.bankName !== undefined) patch.bankName = v.bankName ?? null
    if (v.bankAccountNumber !== undefined) patch.bankAccountNumber = v.bankAccountNumber ?? null
    if (v.bankOwnerName !== undefined) patch.bankOwnerName = v.bankOwnerName ?? null
    await AmbassadorRepo.update(id, patch)
    return await this.get(id)
  },

  async remove(actor: Actor, id: number) {
    const a = await this.get(id)
    await assertNotOwnerProtected(actor, { kind: 'ambassador', ambassadorId: id })
    if (a.isProtected) throw ApiError.conflict('Protected ambassador cannot be deleted')
    await AmbassadorRepo.softDelete(id)
  },
}
