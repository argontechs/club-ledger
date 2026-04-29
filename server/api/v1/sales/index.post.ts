import { SaleService } from '~~/server/services/SaleService'
export default defineEventHandler(async (event) => {
  return await SaleService.create(event.context.user! as any, await readBody(event))
})
