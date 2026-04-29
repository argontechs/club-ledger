import { PayoutService } from '~~/server/services/PayoutService'
export default defineEventHandler((event) => {
  const q = getQuery(event)
  return PayoutService.list({
    month: q.month as string | undefined,
    ambassadorId: q.ambassador_id ? Number(q.ambassador_id) : undefined,
  })
})
