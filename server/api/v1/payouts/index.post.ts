import { PayoutService } from '~~/server/services/PayoutService'
export default defineEventHandler(async (event) =>
  PayoutService.create(event.context.user! as any, await readBody(event)))
