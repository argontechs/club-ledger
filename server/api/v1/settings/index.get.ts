import { SettingsService } from '~~/server/services/SettingsService'
import { assertCan } from '~~/server/utils/permissions'

export default defineEventHandler((event) => {
  assertCan(event.context.user! as any, 'settings', 'view')
  return SettingsService.getAll()
})
