import { ClubRepo } from '~~/server/repositories/ClubRepository'
import { saveFile, deleteFromStorage } from '~~/server/utils/storage'
import { ApiError } from '~~/server/utils/errors'
import { assertCan } from '~~/server/utils/permissions'
import { requireClubId } from '~~/server/utils/club'

const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED = ['image/png', 'image/jpeg', 'image/svg+xml']

// Uploads the ACTIVE club's logo (logos are per-club venue identity).
export default defineEventHandler(async (event) => {
  const actor = event.context.user!
  assertCan(actor as any, 'settings', 'edit')
  const clubId = await requireClubId(event)

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

  const club = await ClubRepo.findById(clubId)
  if (club?.logoPath) await deleteFromStorage(club.logoPath).catch(() => {})

  const relPath = `branding/club-${clubId}/logo-${Date.now()}.${ext}`
  await saveFile(relPath, file.data)
  await ClubRepo.update(clubId, { logoPath: relPath })

  return { ok: true, logoUrl: `/api/v1/branding/logo?club=${clubId}` }
})
