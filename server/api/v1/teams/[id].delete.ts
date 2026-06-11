import { TeamService } from '~~/server/services/TeamService'
export default defineEventHandler(async (event) => {
  await TeamService.remove(event.context.user! as any, Number(getRouterParam(event, 'id')))
  return { ok: true }
})
