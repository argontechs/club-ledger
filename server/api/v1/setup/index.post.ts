import { SetupService } from '~~/server/services/SetupService'
export default defineEventHandler(async (event) => SetupService.run(await readBody(event)))
