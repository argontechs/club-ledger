import { generatePayoutSummary } from '~~/server/services/PayoutPdfService'
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const r = await generatePayoutSummary(id)
  setHeader(event, 'content-type', 'application/pdf')
  setHeader(event, 'content-disposition', `attachment; filename="${r.filename}"`)
  return r.pdf
})
