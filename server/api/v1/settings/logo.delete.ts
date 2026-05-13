import { SettingsService } from '~~/server/services/SettingsService'
import { deleteFromStorage } from '~~/server/utils/storage'
import { ApiError } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  const actor = event.context.user!
  if ((actor as any).tier !== 'admin') throw ApiError.forbidden('Insufficient role')
  const path = await SettingsService.get('company_logo_path')
  if (path) {
    await deleteFromStorage(path).catch(() => {})
    await SettingsService.set('company_logo_path', '')
  }
  return { ok: true }
})
