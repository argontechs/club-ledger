import { z } from 'zod'
import { TeamRepo } from '~~/server/repositories/TeamRepository'
import { ApiError } from '~~/server/utils/errors'
import type { Actor } from '~~/server/utils/permissions'

const NameSchema = z.object({ name: z.string().min(1).max(80) })

function assertAdminTier(actor: Actor & { tier?: string }) {
  if ((actor as any).tier !== 'admin') {
    throw ApiError.forbidden('Insufficient role')
  }
}

export const TeamService = {
  async list(actor: Actor & { tier?: string }, clubId?: number) {
    assertAdminTier(actor)
    return TeamRepo.list(clubId)
  },
  async create(actor: Actor & { tier?: string }, clubId: number, body: unknown) {
    assertAdminTier(actor)
    const v = NameSchema.parse(body)
    const r = await TeamRepo.insert({ name: v.name, clubId })
    return await TeamRepo.findById((r as any)[0].insertId)
  },
  async update(actor: Actor & { tier?: string }, id: number, body: unknown) {
    assertAdminTier(actor)
    const t = await TeamRepo.findById(id)
    if (!t) throw ApiError.notFound('Team')
    const v = NameSchema.partial().parse(body)
    await TeamRepo.update(id, v)
    return await TeamRepo.findById(id)
  },
  async remove(actor: Actor & { tier?: string }, id: number) {
    assertAdminTier(actor)
    const t = await TeamRepo.findById(id)
    if (!t) throw ApiError.notFound('Team')
    await TeamRepo.softDelete(id)
  },
}
