import { SetupService } from '~~/server/services/SetupService'
export default defineEventHandler(async () => ({ needsSetup: await SetupService.needsSetup() }))
