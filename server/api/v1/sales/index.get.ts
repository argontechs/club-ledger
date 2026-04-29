import { SaleService } from '~~/server/services/SaleService'
export default defineEventHandler((event) => {
  const q = getQuery(event)
  return SaleService.list({
    month: q.month as string | undefined,
    ambassadorId: q.ambassador_id ? Number(q.ambassador_id) : undefined,
    type: q.type as any,
    status: q.status as any,
  })
})
