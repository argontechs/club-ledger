import { SettingsService } from '~~/server/services/SettingsService'
import { saveFile, deleteFromStorage } from '~~/server/utils/storage'
import { ApiError } from '~~/server/utils/errors'

const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED = ['image/png', 'image/jpeg', 'image/svg+xml']

export default defineEventHandler(async (event) => {
  const actor = event.context.user!
  if ((actor as any).tier !== 'admin') throw ApiError.forbidden('Insufficient role')

  const parts = await readMultipartFormData(event)
  if (!parts || parts.length === 0) throw ApiError.validation({ file: 'No file uploaded' })
  const file = parts.find(p => p.name === 'file' && p.data?.length)
  if (!file || !file.data) throw ApiError.validation({ file: 'No file uploaded' })
  if (file.data.length > MAX_BYTES) throw ApiError.validation({ file: 'File too large (max 2 MB)' })

  const mime = file.type ?? 'image/png'
  if (!ALLOWED.includes(mime)) {
    throw ApiError.validation({ file: 'PNG, JPG, or SVG only' })
  }
  const ext = mime === 'image/svg+xml' ? 'svg' : mime === 'image/jpeg' ? 'jpg' : 'png'

  const existing = await SettingsService.get('company_logo_path')
  if (existing) await deleteFromStorage(existing).catch(() => {})

  const relPath = `branding/logo-${Date.now()}.${ext}`
  await saveFile(relPath, file.data)
  await SettingsService.set('company_logo_path', relPath)

  return { ok: true, logoUrl: '/api/v1/branding/logo' }
})
