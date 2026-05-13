import { ApiError } from '~~/server/utils/errors'

export default defineEventHandler((event) => {
  const u = event.context.user
  if (!u) throw ApiError.unauthorized()
  return { id: u.id, email: u.email, name: u.name, role: u.roleName, tier: u.tier, ambassadorId: u.ambassadorId }
})
