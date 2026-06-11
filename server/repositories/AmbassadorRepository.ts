import { and, eq, isNull } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'

export const AmbassadorRepo = {
  list({ clubId, teamId, includeDeleted = false }: { clubId?: number; teamId?: number; includeDeleted?: boolean } = {}) {
    const db = useDB()
    const where = [
      ...(includeDeleted ? [] : [isNull(schema.ambassadors.deletedAt)]),
      ...(clubId !== undefined ? [eq(schema.ambassadors.clubId, clubId)] : []),
      ...(teamId !== undefined ? [eq(schema.ambassadors.teamId, teamId)] : []),
    ]
    return db.select().from(schema.ambassadors).where(where.length ? and(...where) : undefined)
  },
  findById(id: number) {
    return useDB().select().from(schema.ambassadors).where(eq(schema.ambassadors.id, id)).limit(1)
      .then(rows => rows[0])
  },
  insert(values: {
    name: string
    fullName?: string | null
    ic?: string | null
    teamId?: number | null
    roleId: number
    clubId: number
    bankName?: string | null
    bankAccountNumber?: string | null
    bankOwnerName?: string | null
    isProtected?: number
  }) {
    return useDB().insert(schema.ambassadors).values({
      name: values.name,
      fullName: values.fullName ?? null,
      ic: values.ic ?? null,
      teamId: values.teamId ?? null,
      roleId: values.roleId,
      clubId: values.clubId,
      bankName: values.bankName ?? null,
      bankAccountNumber: values.bankAccountNumber ?? null,
      bankOwnerName: values.bankOwnerName ?? null,
      isProtected: values.isProtected ?? 0,
    })
  },
  update(id: number, patch: Partial<{
    name: string
    fullName: string | null
    ic: string | null
    teamId: number | null
    roleId: number
    bankName: string | null
    bankAccountNumber: string | null
    bankOwnerName: string | null
  }>) {
    return useDB().update(schema.ambassadors).set({ ...patch, updatedAt: new Date() }).where(eq(schema.ambassadors.id, id))
  },
  softDelete(id: number) {
    return useDB().update(schema.ambassadors).set({ deletedAt: new Date() }).where(eq(schema.ambassadors.id, id))
  },
}
