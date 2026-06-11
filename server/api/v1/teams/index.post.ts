import { TeamService } from '~~/server/services/TeamService'
export default defineEventHandler(async (event) =>
  TeamService.create(event.context.user! as any, await readBody(event)))
