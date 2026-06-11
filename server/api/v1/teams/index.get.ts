import { TeamService } from '~~/server/services/TeamService'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  const clubId = await requireClubId(event)
  return TeamService.list(event.context.user! as any, clubId)
})
