import { generatePayslip } from '~~/server/services/PayoutPdfService'
import { saveFile, deleteFromStorage } from '~~/server/utils/storage'
import { PayoutRepo } from '~~/server/repositories/PayoutRepository'
import { ApiError } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  if ((event.context.user as any)?.tier !== 'admin') {
    throw ApiError.forbidden('Insufficient role')
  }
  const id = Number(getRouterParam(event, 'id'))
  const existing = await PayoutRepo.findById(id)
  if (!existing) throw ApiError.notFound('Payout')
  const r = await generatePayslip(id)
  if (existing.payslipPath) await deleteFromStorage(existing.payslipPath).catch(() => {})
  const relPath = `payouts/${id}/payslip/${Date.now()}_${r.filename}`
  await saveFile(relPath, r.pdf)
  await PayoutRepo.update(id, { payslipPath: relPath })
  return { filename: r.filename, path: relPath }
})
