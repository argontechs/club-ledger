import { SettingsService } from '~~/server/services/SettingsService'
import { readFileFromStorage } from '~~/server/utils/storage'
import { ApiError } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  const path = await SettingsService.get('company_logo_path')
  if (!path) throw ApiError.notFound('Logo not uploaded')
  const data = await readFileFromStorage(path)
  const ext = path.split('.').pop()?.toLowerCase() ?? 'png'
  const mime =
    ext === 'svg' ? 'image/svg+xml' :
    ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png'
  setResponseHeader(event, 'Content-Type', mime)
  setResponseHeader(event, 'Cache-Control', 'public, max-age=60')
  return data
})
