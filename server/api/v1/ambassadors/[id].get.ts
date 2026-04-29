import { AmbassadorService } from '~~/server/services/AmbassadorService'
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  return await AmbassadorService.get(id)
})
