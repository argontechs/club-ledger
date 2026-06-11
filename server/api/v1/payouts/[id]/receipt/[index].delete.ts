import { PayoutService } from '~~/server/services/PayoutService'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  const clubId = await requireClubId(event)
  const id = Number(getRouterParam(event, 'id'))
  const index = Number(getRouterParam(event, 'index'))
  await PayoutService.deleteReceipt(event.context.user!, clubId, id, index)
  return { ok: true }
})
