import { SaleService } from '~~/server/services/SaleService'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  const clubId = await requireClubId(event)
  const q = getQuery(event)
  return SaleService.list({
    clubId,
    month: q.month as string | undefined,
    ambassadorId: q.ambassador_id ? Number(q.ambassador_id) : undefined,
    type: q.type as any,
    status: q.status as any,
  })
})
