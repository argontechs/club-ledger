import { ClubService } from '~~/server/services/ClubService'
export default defineEventHandler((event) => {
  const actor = event.context.user! as any
  return getQuery(event).stats === '1' ? ClubService.listWithStats(actor) : ClubService.list(actor)
})
