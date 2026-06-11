import { ClubService } from '~~/server/services/ClubService'
export default defineEventHandler(async (event) =>
  ClubService.update(event.context.user! as any, Number(getRouterParam(event, 'id')), await readBody(event)))
