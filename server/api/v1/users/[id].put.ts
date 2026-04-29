import { UserService } from '~~/server/services/UserService'
export default defineEventHandler(async (event) =>
  UserService.update(event.context.user!, Number(getRouterParam(event, 'id')), await readBody(event)))
