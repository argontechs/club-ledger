import { PayoutService } from '~~/server/services/PayoutService'
import { ApiError } from '~~/server/utils/errors'
import { requireClubId } from '~~/server/utils/club'

export default defineEventHandler(async (event) => {
  const clubId = await requireClubId(event)
  const id = Number(getRouterParam(event, 'id'))
  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'receipt')
  if (!file?.data) throw ApiError.validation({ receipt: 'Missing file' })
  const allowed = ['application/pdf', 'image/png', 'image/jpeg']
  if (!allowed.includes(file.type ?? '')) throw ApiError.validation({ receipt: 'Only PDF, PNG, or JPG allowed' })
  if (file.data.length > 10 * 1024 * 1024) throw ApiError.validation({ receipt: 'Max 10MB' })
  return await PayoutService.addReceipt(event.context.user!, clubId, id, {
    name: file.filename ?? 'receipt',
    mime: file.type ?? 'application/octet-stream',
    data: file.data,
  })
})
