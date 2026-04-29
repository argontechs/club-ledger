import { UserService } from '~~/server/services/UserService'
export default defineEventHandler(async (event) => {
  await UserService.remove(event.context.user!, Number(getRouterParam(event, 'id')))
  return { ok: true }
})
