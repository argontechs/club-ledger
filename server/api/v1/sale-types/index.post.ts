import { SaleTypeService } from '~~/server/services/SaleTypeService'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  const clubId = await requireClubId(event)
  return SaleTypeService.create(event.context.user! as any, clubId, await readBody(event))
})
