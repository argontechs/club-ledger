import { SaleService } from '~~/server/services/SaleService'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  const clubId = await requireClubId(event)
  const body = await readBody(event)
  return await SaleService.confirmDrafts(event.context.user!, {
    clubId,
    ambassadorId: body?.ambassadorId,
    month: body?.month,
  })
})
