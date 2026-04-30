import { changePassword } from '~~/server/services/AuthService'
import { ApiError } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  const u = event.context.user
  if (!u) throw ApiError.unauthorized()
  const body = await readBody(event)
  return await changePassword(u.id, body)
})
