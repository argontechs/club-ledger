import { TeamService } from '~~/server/services/TeamService'
export default defineEventHandler(async (event) =>
  TeamService.update(Number(getRouterParam(event, 'id')), await readBody(event)))
