import { PDFImportService } from '~~/server/services/PDFImportService'
import { ApiError } from '~~/server/utils/errors'

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file')
  if (!file) throw ApiError.validation({ file: 'Missing file' })
  return await PDFImportService.dryRun(file.data)
})
