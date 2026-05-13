import { RoleService } from '~~/server/services/RoleService'
export default defineEventHandler(() => RoleService.list())
