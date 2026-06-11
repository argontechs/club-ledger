import { PDFImportService } from '~~/server/services/PDFImportService'
import { requireClubId } from '~~/server/utils/club'
export default defineEventHandler(async (event) => {
  const clubId = await requireClubId(event)
  return PDFImportService.commit(event.context.user! as any, clubId, await readBody(event))
})
