import { PayoutService } from '~~/server/services/PayoutService'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  const clubId = await requireClubId(event)
  await PayoutService.remove(event.context.user!, clubId, Number(getRouterParam(event, 'id')))
  return { ok: true }
})
