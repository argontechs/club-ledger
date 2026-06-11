import { PayoutService } from '~~/server/services/PayoutService'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  const clubId = await requireClubId(event)
  return PayoutService.markPaid(event.context.user!, clubId, Number(getRouterParam(event, 'id')))
})
