import { SaleService } from '~~/server/services/SaleService'
export default defineEventHandler((event) => SaleService.get(Number(getRouterParam(event, 'id'))))
