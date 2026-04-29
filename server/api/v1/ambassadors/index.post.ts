import { AmbassadorService } from '~~/server/services/AmbassadorService'
export default defineEventHandler(async (event) => {
  const actor = event.context.user!
  const body = await readBody(event)
  return await AmbassadorService.create(actor, body)
})
