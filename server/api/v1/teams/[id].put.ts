import { TeamService } from '~~/server/services/TeamService'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  const clubId = await requireClubId(event)
  return TeamService.update(event.context.user! as any, clubId, Number(getRouterParam(event, 'id')), await readBody(event))
})
