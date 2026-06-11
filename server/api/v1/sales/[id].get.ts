import { assertCan } from '~~/server/utils/permissions'
import { SaleService } from '~~/server/services/SaleService'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  assertCan(event.context.user! as any, 'sales', 'view')
  const clubId = await requireClubId(event)
  return SaleService.get(Number(getRouterParam(event, 'id')), clubId)
})
