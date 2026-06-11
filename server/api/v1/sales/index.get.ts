import { assertCan } from '~~/server/utils/permissions'
import { SaleService } from '~~/server/services/SaleService'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  assertCan(event.context.user! as any, 'sales', 'view')
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
