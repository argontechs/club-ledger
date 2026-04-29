import { PDFImportService } from '~~/server/services/PDFImportService'
export default defineEventHandler(async (event) =>
  PDFImportService.commit(event.context.user! as any, await readBody(event)))
