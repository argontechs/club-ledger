import { UserService } from '~~/server/services/UserService'
export default defineEventHandler((event) => UserService.list(event.context.user! as any))
