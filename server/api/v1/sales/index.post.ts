import { SaleService } from '~~/server/services/SaleService'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  const clubId = await requireClubId(event)
  return await SaleService.create(event.context.user! as any, clubId, await readBody(event))
})
