import { ClubRepo } from '~~/server/repositories/ClubRepository'
import { deleteFromStorage } from '~~/server/utils/storage'
import { ApiError } from '~~/server/utils/errors'
import { assertCan } from '~~/server/utils/permissions'
import { requireClubId } from '~~/server/utils/club'

export default defineEventHandler(async (event) => {
  const actor = event.context.user!
  assertCan(actor as any, 'settings', 'edit')
  const clubId = await requireClubId(event)
  const club = await ClubRepo.findById(clubId)
  if (club?.logoPath) {
    await deleteFromStorage(club.logoPath).catch(() => {})
    await ClubRepo.update(clubId, { logoPath: null })
  }
  return { ok: true }
})
