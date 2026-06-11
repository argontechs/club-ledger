import { PDFImportService } from '~~/server/services/PDFImportService'
import { ApiError } from '~~/server/utils/errors'

const MAX_PDF_BYTES = 20 * 1024 * 1024  // 20 MB

export default defineEventHandler(async (event) => {
  const actor = event.context.user!
  if ((actor as any).tier !== 'admin') {
    throw ApiError.forbidden('Insufficient role')
  }
  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file')
  if (!file) throw ApiError.validation({ file: 'Missing file' })
  if (file.data.length > MAX_PDF_BYTES) throw ApiError.validation({ file: 'Max 20MB' })
  if (file.type && file.type !== 'application/pdf') throw ApiError.validation({ file: 'Only PDF' })
  return await PDFImportService.dryRun(file.data)
})
