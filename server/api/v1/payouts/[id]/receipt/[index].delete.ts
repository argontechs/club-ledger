import { PayoutService } from '~~/server/services/PayoutService'
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const index = Number(getRouterParam(event, 'index'))
  await PayoutService.deleteReceipt(event.context.user!, id, index)
  return { ok: true }
})
