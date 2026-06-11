import { AmbassadorService } from '~~/server/services/AmbassadorService'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  const clubId = await requireClubId(event)
  const id = Number(getRouterParam(event, 'id'))
  return await AmbassadorService.get(id, event.context.user! as any, clubId)
})
