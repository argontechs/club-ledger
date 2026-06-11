import { AmbassadorService } from '~~/server/services/AmbassadorService'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  const clubId = await requireClubId(event)
  return await AmbassadorService.create(event.context.user! as any, clubId, await readBody(event))
})
