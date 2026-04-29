import { SaleService } from '~~/server/services/SaleService'
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return await SaleService.confirmDrafts(event.context.user!, {
    ambassadorId: body?.ambassadorId,
    month: body?.month,
  })
})
