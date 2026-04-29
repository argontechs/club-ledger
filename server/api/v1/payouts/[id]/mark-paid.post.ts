import { PayoutService } from '~~/server/services/PayoutService'
export default defineEventHandler((event) =>
  PayoutService.markPaid(event.context.user!, Number(getRouterParam(event, 'id'))))
