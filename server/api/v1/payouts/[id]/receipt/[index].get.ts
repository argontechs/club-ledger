import { PayoutService } from '~~/server/services/PayoutService'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  const clubId = await requireClubId(event)
  const id = Number(getRouterParam(event, 'id'))
  const index = Number(getRouterParam(event, 'index'))
  const r = await PayoutService.getReceipt(event.context.user!, clubId, id, index)
  setHeader(event, 'content-type', r.mime)
  setHeader(event, 'content-disposition', `attachment; filename="${encodeURIComponent(r.name)}"`)
  return r.data
})
