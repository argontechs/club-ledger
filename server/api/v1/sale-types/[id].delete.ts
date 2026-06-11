import { SaleTypeService } from '~~/server/services/SaleTypeService'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  const clubId = await requireClubId(event)
  await SaleTypeService.remove(event.context.user! as any, clubId, Number(getRouterParam(event, 'id')))
  return { ok: true }
})
