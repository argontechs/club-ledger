import { AmbassadorService } from '~~/server/services/AmbassadorService'
import { ApiError } from '~~/server/utils/errors'
import { can } from '~~/shared/permissions'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  const actor = event.context.user! as any
  if (!can(actor, 'ambassadors', 'view') && !can(actor, 'sales', 'view') && !can(actor, 'commissions', 'view')) {
    throw ApiError.forbidden('Insufficient permissions')
  }
  const clubId = await requireClubId(event)
  const id = Number(getRouterParam(event, 'id'))
  return await AmbassadorService.get(id, event.context.user! as any, clubId)
})
