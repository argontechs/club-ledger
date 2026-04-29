import { PayoutService } from '~~/server/services/PayoutService'
export default defineEventHandler(async (event) => {
  await PayoutService.remove(event.context.user!, Number(getRouterParam(event, 'id')))
  return { ok: true }
})
