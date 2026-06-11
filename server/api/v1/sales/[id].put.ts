import { SaleService } from '~~/server/services/SaleService'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  const clubId = await requireClubId(event)
  return SaleService.update(event.context.user!, clubId, Number(getRouterParam(event, 'id')), await readBody(event))
})
