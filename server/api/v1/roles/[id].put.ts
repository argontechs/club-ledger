import { RoleService } from '~~/server/services/RoleService'
import { ApiError } from '~~/server/utils/errors'
import { requireClubId } from '~~/server/utils/club'

export default defineEventHandler(async (event) => {
  const actor = event.context.user!
  const clubId = await requireClubId(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id)) throw ApiError.validation({ id: 'Invalid role id' })
  return await RoleService.update(actor as any, clubId, id, await readBody(event))
})
