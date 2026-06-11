import { SettingsService } from '~~/server/services/SettingsService'
import { ApiError } from '~~/server/utils/errors'

export default defineEventHandler((event) => {
  if ((event.context.user as any)?.tier !== 'admin') {
    throw ApiError.forbidden('Insufficient role')
  }
  return SettingsService.getAll()
})
