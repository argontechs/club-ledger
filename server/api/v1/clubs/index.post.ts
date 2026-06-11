import { ClubService } from '~~/server/services/ClubService'
export default defineEventHandler(async (event) =>
  ClubService.create(event.context.user! as any, await readBody(event)))
