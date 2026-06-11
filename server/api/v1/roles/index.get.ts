import { RoleService } from '~~/server/services/RoleService'
import { requireClubId } from '~~/server/utils/club'
import { ApiError } from '~~/server/utils/errors'
import { can } from '~~/shared/permissions'
export default defineEventHandler(async (event) => {
  const actor = event.context.user! as any
  // ?scope=staff → company-level login roles (access page); default → the
  // active club's commission roles (roles page, ambassador forms).
  if (getQuery(event).scope === 'staff') {
    if (actor.tier !== 'admin') throw ApiError.forbidden('Insufficient permissions')
    return RoleService.listStaff()
  }
  if (!can(actor, 'roles', 'view') && !can(actor, 'ambassadors', 'view')) {
    throw ApiError.forbidden('Insufficient permissions')
  }
  const clubId = await requireClubId(event)
  return RoleService.listForClub(clubId)
})
