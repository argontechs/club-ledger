import { TeamService } from '~~/server/services/TeamService'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  const clubId = await requireClubId(event)
  return TeamService.create(event.context.user! as any, clubId, await readBody(event))
})
