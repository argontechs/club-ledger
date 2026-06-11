import { eq } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'

export default defineEventHandler(async (event) => {
  const user = event.context.user!
  const rows = await useDB().select({ onboardingState: schema.users.onboardingState })
    .from(schema.users).where(eq(schema.users.id, user.id)).limit(1)
  return rows[0]?.onboardingState ?? {}
})
