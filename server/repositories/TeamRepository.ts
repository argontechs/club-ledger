import { and, eq, isNull } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'

export const TeamRepo = {
  list() {
    return useDB().select().from(schema.teams).where(isNull(schema.teams.deletedAt))
  },
  findById(id: number) {
    return useDB().select().from(schema.teams).where(eq(schema.teams.id, id)).limit(1).then(r => r[0])
  },
  insert(values: { name: string }) {
    return useDB().insert(schema.teams).values(values)
  },
  update(id: number, patch: { name?: string }) {
    return useDB().update(schema.teams).set({ ...patch, updatedAt: new Date() }).where(eq(schema.teams.id, id))
  },
  softDelete(id: number) {
    return useDB().update(schema.teams).set({ deletedAt: new Date() }).where(eq(schema.teams.id, id))
  },
}
