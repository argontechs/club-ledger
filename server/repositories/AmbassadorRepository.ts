import { and, eq, isNull } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'

export const AmbassadorRepo = {
  list({ teamId, includeDeleted = false }: { teamId?: number; includeDeleted?: boolean } = {}) {
    const db = useDB()
    const where = [
      ...(includeDeleted ? [] : [isNull(schema.ambassadors.deletedAt)]),
      ...(teamId !== undefined ? [eq(schema.ambassadors.teamId, teamId)] : []),
    ]
    return db.select().from(schema.ambassadors).where(where.length ? and(...where) : undefined)
  },
  findById(id: number) {
    return useDB().select().from(schema.ambassadors).where(eq(schema.ambassadors.id, id)).limit(1)
      .then(rows => rows[0])
  },
  insert(values: { name: string; teamId?: number | null; commissionRate?: string }) {
    return useDB().insert(schema.ambassadors).values({
      name: values.name, teamId: values.teamId ?? null,
      commissionRate: values.commissionRate ?? '8.00',
    })
  },
  update(id: number, patch: Partial<{ name: string; teamId: number | null; commissionRate: string }>) {
    return useDB().update(schema.ambassadors).set({ ...patch, updatedAt: new Date() }).where(eq(schema.ambassadors.id, id))
  },
  softDelete(id: number) {
    return useDB().update(schema.ambassadors).set({ deletedAt: new Date() }).where(eq(schema.ambassadors.id, id))
  },
}
