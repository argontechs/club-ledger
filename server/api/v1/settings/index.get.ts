import { SettingsService } from '~~/server/services/SettingsService'
export default defineEventHandler(() => SettingsService.getAll())
