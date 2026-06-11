import type { H3Event } from 'h3'
import { getHeader } from 'h3'
import { ClubRepo } from '~~/server/repositories/ClubRepository'
import { ApiError } from '~~/server/utils/errors'

// Club context for club-scoped endpoints. The frontend sends the selected
// club as an X-Club-Id header; company-scoped endpoints (auth, users,
// settings, clubs) never call this.
export async function requireClubId(event: H3Event): Promise<number> {
  if (event.context.clubId) return event.context.clubId
  const raw = getHeader(event, 'x-club-id')
  const id = Number(raw)
  if (!raw || !Number.isInteger(id) || id <= 0) {
    throw ApiError.validation({ club: 'Missing or invalid X-Club-Id header' })
  }
  const club = await ClubRepo.findById(id)
  if (!club || club.deletedAt) {
    throw ApiError.validation({ club: 'Unknown club' })
  }
  event.context.clubId = id
  return id
}
