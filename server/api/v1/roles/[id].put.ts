import { RoleService } from '~~/server/services/RoleService'
import { ApiError } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  const actor = event.context.user!
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id)) throw ApiError.validation({ id: 'Invalid role id' })
  return await RoleService.update(actor as any, id, await readBody(event))
})
