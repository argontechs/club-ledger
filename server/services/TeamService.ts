import { z } from 'zod'
import { TeamRepo } from '~~/server/repositories/TeamRepository'
import { ApiError } from '~~/server/utils/errors'
import { assertCan, type Actor } from '~~/server/utils/permissions'

const NameSchema = z.object({ name: z.string().min(1).max(80) })

function assertAdminTier(actor: Actor & { tier?: string }) {
  assertCan(actor, 'teams', 'edit')
}

export const TeamService = {
  async list(actor: Actor & { tier?: string }, clubId?: number) {
    assertCan(actor, 'teams', 'view')
    return TeamRepo.list(clubId)
  },
  async create(actor: Actor & { tier?: string }, clubId: number, body: unknown) {
    assertAdminTier(actor)
    const v = NameSchema.parse(body)
    const r = await TeamRepo.insert({ name: v.name, clubId })
    return await TeamRepo.findById((r as any)[0].insertId)
  },
  async update(actor: Actor & { tier?: string }, clubId: number, id: number, body: unknown) {
    assertAdminTier(actor)
    const t = await TeamRepo.findById(id)
    if (!t || t.clubId !== clubId) throw ApiError.notFound('Team')
    const v = NameSchema.partial().parse(body)
    await TeamRepo.update(id, v)
    return await TeamRepo.findById(id)
  },
  async remove(actor: Actor & { tier?: string }, clubId: number, id: number) {
    assertAdminTier(actor)
    const t = await TeamRepo.findById(id)
    if (!t || t.clubId !== clubId) throw ApiError.notFound('Team')
    await TeamRepo.softDelete(id)
  },
}
