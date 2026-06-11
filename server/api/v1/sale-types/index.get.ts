import { assertCan } from '~~/server/utils/permissions'
import { SaleTypeService } from '~~/server/services/SaleTypeService'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  assertCan(event.context.user! as any, 'sales', 'view')
  const clubId = await requireClubId(event)
  return SaleTypeService.list(clubId)
})
