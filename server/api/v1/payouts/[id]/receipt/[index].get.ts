import { PayoutService } from '~~/server/services/PayoutService'
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const index = Number(getRouterParam(event, 'index'))
  const r = await PayoutService.getReceipt(event.context.user!, id, index)
  setHeader(event, 'content-type', r.mime)
  setHeader(event, 'content-disposition', `attachment; filename="${encodeURIComponent(r.name)}"`)
  return r.data
})
