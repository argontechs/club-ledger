import { generateRangeReport } from '~~/server/services/PayoutPdfService'
import { ApiError } from '~~/server/utils/errors'
import { requireClubId } from '~~/server/utils/club'
import { assertCan } from '~~/server/utils/permissions'

const DATE = /^\d{4}-\d{2}-\d{2}$/

// Date-range commission report (e.g. the weekly submission 404/Nono send).
// Covers every earner, so it stays admin-tier on top of commissions view.
export default defineEventHandler(async (event) => {
  const actor = event.context.user! as any
  assertCan(actor, 'commissions', 'view')
  if (!actor.isOwner && actor.tier !== 'admin') throw ApiError.forbidden('Insufficient permissions')
  const q = getQuery(event)
  const from = String(q.from || '')
  const to = String(q.to || '')
  if (!DATE.test(from) || !DATE.test(to)) throw ApiError.validation({ range: 'expected from/to as YYYY-MM-DD' })
  if (from > to) throw ApiError.validation({ range: 'from must not be after to' })
  const clubId = await requireClubId(event)
  const r = await generateRangeReport(clubId, from, to)
  setHeader(event, 'content-type', 'application/pdf')
  setHeader(event, 'content-disposition', `attachment; filename="${r.filename}"`)
  return r.pdf
})
