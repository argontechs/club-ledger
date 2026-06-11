import { TeamService } from '~~/server/services/TeamService'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  const clubId = await requireClubId(event)
  await TeamService.remove(event.context.user! as any, clubId, Number(getRouterParam(event, 'id')))
  return { ok: true }
})
