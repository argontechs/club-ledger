import { assertCan } from '~~/server/utils/permissions'
import { PayoutService } from '~~/server/services/PayoutService'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  assertCan(event.context.user! as any, 'payouts', 'view')
  const clubId = await requireClubId(event)
  const q = getQuery(event)
  return PayoutService.list({
    clubId,
    month: q.month as string | undefined,
    ambassadorId: q.ambassador_id ? Number(q.ambassador_id) : undefined,
  })
})
