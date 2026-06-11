import { PayoutRepo } from '~~/server/repositories/PayoutRepository'
import { readFileFromStorage } from '~~/server/utils/storage'
import { ApiError } from '~~/server/utils/errors'
import { requireClubId } from '~~/server/utils/club'

export default defineEventHandler(async (event) => {
  const clubId = await requireClubId(event)
  const id = Number(getRouterParam(event, 'id'))
  const p = await PayoutRepo.findById(id)
  if (!p || p.clubId !== clubId || !p.payslipPath) throw ApiError.notFound('Payslip')
  const data = await readFileFromStorage(p.payslipPath)
  setHeader(event, 'content-type', 'application/pdf')
  setHeader(event, 'content-disposition', `attachment; filename="${p.payslipPath.split('/').pop()}"`)
  return data
})
