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
  // The upload timestamp baked into the filename versions the URL, so a
  // replaced logo always gets a fresh URL — no stale browser/proxy caches.
  const version = club?.logoPath?.match(/logo-(\d+)/)?.[1] ?? '0'
  return {
    clubId: club?.id ?? null,
    logoUrl: club?.logoPath ? `/api/v1/branding/logo?club=${club.id}&v=${version}` : null,
    venueName: club?.name || 'Nono Club',
    currencySymbol: currencySymbol || 'RM',
  }
})
