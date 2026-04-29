import { TeamService } from '~~/server/services/TeamService'
export default defineEventHandler(async (event) => {
  await TeamService.remove(Number(getRouterParam(event, 'id')))
  return { ok: true }
})
