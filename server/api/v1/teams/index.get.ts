import { TeamService } from '~~/server/services/TeamService'
export default defineEventHandler(() => TeamService.list())
