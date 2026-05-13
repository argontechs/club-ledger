import { SettingsService } from '~~/server/services/SettingsService'

export default defineEventHandler(async () => {
  const logoPath = await SettingsService.get('company_logo_path')
  const venueName = await SettingsService.get('venue_name')
  return {
    logoUrl: logoPath ? `/api/v1/branding/logo` : null,
    venueName: venueName || 'Nono Club',
  }
})
