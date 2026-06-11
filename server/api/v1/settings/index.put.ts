import { z } from 'zod'
import { SettingsService } from '~~/server/services/SettingsService'
import { ApiError } from '~~/server/utils/errors'

// venue_name moved to the clubs table (per-club identity) in migration 0004.
const Schema = z.object({
  currency: z.string().optional(),
  currency_symbol: z.string().optional(),
  company_name: z.string().optional(),
  company_address: z.string().optional(),
  company_registration: z.string().optional(),
  company_phone: z.string().optional(),
  company_email: z.string().optional(),
  label_registration: z.string().optional(),
  label_id_document: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const actor = event.context.user!
  if ((actor as any).tier !== 'admin') {
    throw ApiError.forbidden('Insufficient role')
  }
  const body = Schema.parse(await readBody(event))
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined) continue
    await SettingsService.set(k, String(v))
  }
  return await SettingsService.getAll()
})
