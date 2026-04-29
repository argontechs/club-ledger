import { TeamService } from '~~/server/services/TeamService'
export default defineEventHandler(async (event) => TeamService.create(await readBody(event)))
