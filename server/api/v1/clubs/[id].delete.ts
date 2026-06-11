import { ClubService } from '~~/server/services/ClubService'
export default defineEventHandler(async (event) => {
  await ClubService.remove(event.context.user! as any, Number(getRouterParam(event, 'id')))
  return { ok: true }
})
