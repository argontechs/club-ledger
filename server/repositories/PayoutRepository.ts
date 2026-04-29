import { and, eq } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'

export const PayoutRepo = {
  list(filter: { month?: string; ambassadorId?: number } = {}) {
    const db = useDB()
    const where = []
    if (filter.month) where.push(eq(schema.payouts.periodMonth, filter.month))
    if (filter.ambassadorId) where.push(eq(schema.payouts.ambassadorId, filter.ambassadorId))
    return db.select().from(schema.payouts).where(where.length ? and(...where) : undefined)
  },
  insert(values: { ambassadorId: number; periodMonth: string; amount: string; notes?: string | null; createdBy: number; paidAt?: Date | null }) {
    return useDB().insert(schema.payouts).values({ ...values, paidAt: values.paidAt ?? null })
  },
  update(id: number, patch: Partial<{ amount: string; notes: string | null; paidAt: Date | null; receiptPaths: any; payslipPath: string | null }>) {
    return useDB().update(schema.payouts).set({ ...patch, updatedAt: new Date() }).where(eq(schema.payouts.id, id))
  },
  findById(id: number) {
    return useDB().select().from(schema.payouts).where(eq(schema.payouts.id, id)).limit(1).then(r => r[0])
  },
  delete(id: number) {
    return useDB().delete(schema.payouts).where(eq(schema.payouts.id, id))
  },
}
