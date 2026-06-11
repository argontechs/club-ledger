import { ClubRepo } from '~~/server/repositories/ClubRepository'
import { SettingsService } from '~~/server/services/SettingsService'

// Public: the login page needs branding before any auth/club context exists.
// ?club=N returns that club's branding; default is the first club.
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const requested = q.club ? Number(q.club) : null
  const clubs = await ClubRepo.list()
  const club = (requested ? clubs.find(c => c.id === requested) : clubs[0]) ?? clubs[0]
  const currencySymbol = await SettingsService.get('currency_symbol')
  return {
    clubId: club?.id ?? null,
    logoUrl: club?.logoPath ? `/api/v1/branding/logo?club=${club.id}` : null,
    venueName: club?.name || 'Nono Club',
    currencySymbol: currencySymbol || 'RM',
  }
})
