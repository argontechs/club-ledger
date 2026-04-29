import { SaleService } from '~~/server/services/SaleService'
export default defineEventHandler(async (event) =>
  SaleService.update(event.context.user!, Number(getRouterParam(event, 'id')), await readBody(event)))
