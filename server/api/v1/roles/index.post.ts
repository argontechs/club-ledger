import { RoleService } from '~~/server/services/RoleService'
export default defineEventHandler(async (event) => {
  const actor = event.context.user!
  return await RoleService.create(actor as any, await readBody(event))
})
