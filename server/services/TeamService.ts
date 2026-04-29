import { z } from 'zod'
import { TeamRepo } from '~~/server/repositories/TeamRepository'
import { ApiError } from '~~/server/utils/errors'

const NameSchema = z.object({ name: z.string().min(1).max(80) })

export const TeamService = {
  list: TeamRepo.list,
  async create(body: unknown) {
    const v = NameSchema.parse(body)
    const r = await TeamRepo.insert({ name: v.name })
    return await TeamRepo.findById((r as any)[0].insertId)
  },
  async update(id: number, body: unknown) {
    const t = await TeamRepo.findById(id)
    if (!t) throw ApiError.notFound('Team')
    const v = NameSchema.partial().parse(body)
    await TeamRepo.update(id, v)
    return await TeamRepo.findById(id)
  },
  async remove(id: number) {
    const t = await TeamRepo.findById(id)
    if (!t) throw ApiError.notFound('Team')
    await TeamRepo.softDelete(id)
  },
}
