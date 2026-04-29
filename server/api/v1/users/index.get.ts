import { UserService } from '~~/server/services/UserService'
export default defineEventHandler(() => UserService.list())
