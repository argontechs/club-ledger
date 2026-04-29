import { SaleService } from '~~/server/services/SaleService'
export default defineEventHandler((event) =>
  SaleService.void(event.context.user!, Number(getRouterParam(event, 'id'))))
