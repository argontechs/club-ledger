import { z } from 'zod'
import { SettingsService } from '~~/server/services/SettingsService'

const Schema = z.object({
  default_commission_rate: z.union([z.string(), z.number()]).optional(),
  bonus_rate: z.union([z.string(), z.number()]).optional(),
  currency: z.string().optional(),
  currency_symbol: z.string().optional(),
  venue_name: z.string().optional(),
  company_name: z.string().optional(),
  company_address: z.string().optional(),
  company_registration: z.string().optional(),
  company_phone: z.string().optional(),
  company_email: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const body = Schema.parse(await readBody(event))
  for (const [k, v] of Object.entries(body)) {
    if (v === undefined) continue
    const value = typeof v === 'number' ? v.toFixed(2) : String(v)
    await SettingsService.set(k, value)
  }
  return await SettingsService.getAll()
})
