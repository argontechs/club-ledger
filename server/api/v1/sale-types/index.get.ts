import { SaleTypeService } from '~~/server/services/SaleTypeService'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  const clubId = await requireClubId(event)
  return SaleTypeService.list(clubId)
})
