import { TeamService } from '~~/server/services/TeamService'
export default defineEventHandler((event) => TeamService.list(event.context.user! as any))
