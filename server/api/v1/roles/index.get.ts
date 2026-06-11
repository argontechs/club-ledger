import { RoleService } from '~~/server/services/RoleService'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  // ?scope=staff → company-level login roles (access page); default → the
  // active club's commission roles (roles page, ambassador forms).
  if (getQuery(event).scope === 'staff') return RoleService.listStaff()
  const clubId = await requireClubId(event)
  return RoleService.listForClub(clubId)
})
