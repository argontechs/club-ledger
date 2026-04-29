import { SaleService } from '~~/server/services/SaleService'
export default defineEventHandler((event) =>
  SaleService.confirm(event.context.user!, Number(getRouterParam(event, 'id'))))
