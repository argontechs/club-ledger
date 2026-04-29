import { AmbassadorService } from '~~/server/services/AmbassadorService'
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  await AmbassadorService.remove(event.context.user!, id)
  return { ok: true }
})
