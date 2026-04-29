import { AmbassadorService } from '~~/server/services/AmbassadorService'
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  return await AmbassadorService.update(event.context.user!, id, body)
})
