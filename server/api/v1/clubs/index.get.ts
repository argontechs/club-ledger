import { ClubService } from '~~/server/services/ClubService'
export default defineEventHandler((event) => ClubService.list(event.context.user! as any))
