import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'
import { ApiError } from '~~/server/utils/errors'

const Schema = z.record(z.string().min(1).max(60), z.enum(['done', 'skipped']))
  .refine(o => Object.keys(o).length <= 20, 'Too many chapters in one patch')

// Merges chapter results into the caller's own onboarding state.
export default defineEventHandler(async (event) => {
  const user = event.context.user!
  const parsed = Schema.safeParse(await readBody(event))
  if (!parsed.success) throw ApiError.validation({ body: 'Expected { [chapterId]: "done" | "skipped" }' })
  const patch = parsed.data
  const db = useDB()
  const rows = await db.select({ onboardingState: schema.users.onboardingState })
    .from(schema.users).where(eq(schema.users.id, user.id)).limit(1)
  const merged = { ...(rows[0]?.onboardingState ?? {}), ...patch }
  await db.update(schema.users).set({ onboardingState: merged }).where(eq(schema.users.id, user.id))
  return merged
})
