import { AmbassadorService } from '~~/server/services/AmbassadorService'
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  return await AmbassadorService.list({
    teamId: q.team_id ? Number(q.team_id) : undefined,
    includeDeleted: q.include_deleted === 'true',
  })
})
