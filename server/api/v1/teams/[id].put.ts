import { TeamService } from '~~/server/services/TeamService'
export default defineEventHandler(async (event) =>
  TeamService.update(event.context.user! as any, Number(getRouterParam(event, 'id')), await readBody(event)))
