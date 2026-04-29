import { PayoutService } from '~~/server/services/PayoutService'
export default defineEventHandler(async (event) =>
  PayoutService.createBatch(event.context.user! as any, await readBody(event)))
