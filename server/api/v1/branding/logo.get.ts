import { ClubRepo } from '~~/server/repositories/ClubRepository'
import { readFileFromStorage } from '~~/server/utils/storage'
import { ApiError } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const requested = q.club ? Number(q.club) : null
  const clubs = await ClubRepo.list()
  const club = (requested ? clubs.find(c => c.id === requested) : clubs[0]) ?? clubs[0]
  const path = club?.logoPath
  if (!path) throw ApiError.notFound('Logo not uploaded')
  const data = await readFileFromStorage(path)
  const ext = path.split('.').pop()?.toLowerCase() ?? 'png'
  const mime =
    ext === 'svg' ? 'image/svg+xml' :
    ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png'
  setResponseHeader(event, 'Content-Type', mime)
  setResponseHeader(event, 'Content-Length', data.length)
  setResponseHeader(event, 'Cache-Control', 'public, max-age=60')
  return new Uint8Array(data)
})
