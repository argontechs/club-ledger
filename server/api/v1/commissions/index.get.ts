import { loadCommissions } from '~~/server/services/CommissionService'
import { ApiError } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  const month = String(getQuery(event).month || '')
  if (!/^\d{4}-\d{2}$/.test(month)) throw ApiError.validation({ month: 'expected YYYY-MM' })

  const actor = event.context.user!
  const all = await loadCommissions(month)

  if (actor.roleName === 'leader' || actor.roleName === 'ambassador') {
    return all.filter(r => r.userId === actor.id)
  }
  return all
})
