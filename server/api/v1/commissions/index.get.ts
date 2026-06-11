import { loadCommissions } from '~~/server/services/CommissionService'
import { ApiError } from '~~/server/utils/errors'
import { requireClubId } from '~~/server/utils/club'

export default defineEventHandler(async (event) => {
  const month = String(getQuery(event).month || '')
  if (!/^\d{4}-\d{2}$/.test(month)) throw ApiError.validation({ month: 'expected YYYY-MM' })

  const actor = event.context.user!
  const clubId = await requireClubId(event)
  const all = await loadCommissions(clubId, month)

  // Hide users with zero activity AND zero bonus — they don't need a row.
  // Always show the actor's own row (so they see their state for the month).
  const visible = all.filter(r =>
    r.userId === actor.id || r.ownSales > 0 || r.bonus > 0,
  )

  // Non-admin tiers only see their own row — keyed on tier, not role names,
  // so renamed or custom roles keep the correct visibility.
  if ((actor as any).tier !== 'admin') {
    return visible.filter(r => r.userId === actor.id)
  }
  return visible
})
