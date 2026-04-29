import { UserService } from '~~/server/services/UserService'
export default defineEventHandler(async (event) =>
  UserService.create(event.context.user!, await readBody(event)))
