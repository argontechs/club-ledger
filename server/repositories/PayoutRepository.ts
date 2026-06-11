import { and, eq } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'

export const PayoutRepo = {
  list(filter: { clubId?: number; month?: string; ambassadorId?: number } = {}) {
    const db = useDB()
    const where = []
    if (filter.clubId) where.push(eq(schema.payouts.clubId, filter.clubId))
    if (filter.month) where.push(eq(schema.payouts.periodMonth, filter.month))
    if (filter.ambassadorId) where.push(eq(schema.payouts.ambassadorId, filter.ambassadorId))
    return db.select().from(schema.payouts).where(where.length ? and(...where) : undefined)
  },
  insert(values: {
    ambassadorId: number
    clubId: number
    periodMonth: string
    amount: string
    notes?: string | null
    createdBy: number
    paidAt?: Date | null
    snapshotBonusRate?: string | null
    snapshotKpiThreshold?: string | null
    snapshotRequiresKpi?: number | null
  }) {
    return useDB().insert(schema.payouts).values({
      ambassadorId: values.ambassadorId,
      clubId: values.clubId,
      periodMonth: values.periodMonth,
      amount: values.amount,
      notes: values.notes ?? null,
      createdBy: values.createdBy,
      paidAt: values.paidAt ?? null,
      snapshotBonusRate: values.snapshotBonusRate ?? null,
      snapshotKpiThreshold: values.snapshotKpiThreshold ?? null,
      snapshotRequiresKpi: values.snapshotRequiresKpi ?? null,
    })
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
