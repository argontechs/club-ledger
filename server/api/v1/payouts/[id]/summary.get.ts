import { assertCan } from '~~/server/utils/permissions'
import { generatePayoutSummary } from '~~/server/services/PayoutPdfService'
import { PayoutRepo } from '~~/server/repositories/PayoutRepository'
import { ApiError } from '~~/server/utils/errors'
import { requireClubId } from '~~/server/utils/club'

export default defineEventHandler(async (event) => {
  assertCan(event.context.user! as any, 'payouts', 'view')
  const clubId = await requireClubId(event)
  const id = Number(getRouterParam(event, 'id'))
  const p = await PayoutRepo.findById(id)
  if (!p || p.clubId !== clubId) throw ApiError.notFound('Payout')
  const r = await generatePayoutSummary(id)
  setHeader(event, 'content-type', 'application/pdf')
  setHeader(event, 'content-disposition', `attachment; filename="${r.filename}"`)
  return r.pdf
})
