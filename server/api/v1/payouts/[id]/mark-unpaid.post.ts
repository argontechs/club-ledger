import { PayoutService } from '~~/server/services/PayoutService'
export default defineEventHandler((event) =>
  PayoutService.markUnpaid(event.context.user!, Number(getRouterParam(event, 'id'))))
