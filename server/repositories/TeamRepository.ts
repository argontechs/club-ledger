import { and, eq, isNull } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'

export const TeamRepo = {
  list(clubId?: number) {
    const where = [isNull(schema.teams.deletedAt), ...(clubId !== undefined ? [eq(schema.teams.clubId, clubId)] : [])]
    return useDB().select().from(schema.teams).where(and(...where))
  },
  findById(id: number) {
    return useDB().select().from(schema.teams).where(eq(schema.teams.id, id)).limit(1).then(r => r[0])
  },
  insert(values: { name: string; clubId: number }) {
    return useDB().insert(schema.teams).values(values)
  },
  update(id: number, patch: { name?: string }) {
    return useDB().update(schema.teams).set({ ...patch, updatedAt: new Date() }).where(eq(schema.teams.id, id))
  },
  softDelete(id: number) {
    return useDB().update(schema.teams).set({ deletedAt: new Date() }).where(eq(schema.teams.id, id))
  },
}
