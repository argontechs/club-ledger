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
  const q = getQuery(event)
  return await AmbassadorService.list(event.context.user! as any, {
    clubId,
    teamId: q.team_id ? Number(q.team_id) : undefined,
    includeDeleted: q.include_deleted === 'true',
  })
})
