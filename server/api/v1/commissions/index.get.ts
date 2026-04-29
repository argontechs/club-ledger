import { loadCommissions } from '~~/server/services/CommissionService'
import { ApiError } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  const month = String(getQuery(event).month || '')
  if (!/^\d{4}-\d{2}$/.test(month)) throw ApiError.validation({ month: 'expected YYYY-MM' })

  const actor = event.context.user!
  const all = await loadCommissions(month)

  // Hide users with zero activity AND zero bonus — they don't need a row.
  // Always show the actor's own row (so they see their state for the month).
  const visible = all.filter(r =>
    r.userId === actor.id || r.ownSales > 0 || r.bonus > 0,
  )

  if (actor.roleName === 'leader' || actor.roleName === 'ambassador') {
    return visible.filter(r => r.userId === actor.id)
  }
  return visible
})
