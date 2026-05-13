import { z } from 'zod'
import { eq, like, and } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'
import { PayoutRepo } from '~~/server/repositories/PayoutRepository'
import { ApiError } from '~~/server/utils/errors'
import { assertNotOwnerProtected, type Actor } from '~~/server/utils/permissions'
import { saveFile, readFileFromStorage, deleteFromStorage } from '~~/server/utils/storage'

const CreateSchema = z.object({
  ambassadorId: z.number().int().positive(),
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.number().nonnegative(),
  notes: z.string().nullish(),
  markPaid: z.boolean().optional(),
})

export const PayoutService = {
  list: PayoutRepo.list,
  async create(actor: Actor & { id: number; roleName: string }, body: unknown) {
    if ((actor as any).tier !== 'admin') {
      throw ApiError.forbidden('Insufficient role')
    }
    const v = CreateSchema.parse(body)
    await assertNotOwnerProtected(actor, { kind: 'payout', ambassadorId: v.ambassadorId })
    const dups = await PayoutRepo.list({ ambassadorId: v.ambassadorId, month: v.periodMonth })
    if (dups.length > 0) {
      throw ApiError.conflict('A payout already exists for this ambassador and month')
    }
    const r = await PayoutRepo.insert({
      ambassadorId: v.ambassadorId,
      periodMonth: v.periodMonth,
      amount: v.amount.toFixed(2),
      notes: v.notes ?? null,
      createdBy: actor.id,
      paidAt: v.markPaid ? new Date() : null,
    })
    return await PayoutRepo.findById((r as any)[0].insertId)
  },
  async markPaid(actor: Actor, id: number) {
    const p = await PayoutRepo.findById(id)
    if (!p) throw ApiError.notFound('Payout')
    await assertNotOwnerProtected(actor, { kind: 'payout', ambassadorId: p.ambassadorId })
    await PayoutRepo.update(id, { paidAt: new Date() })
    return await PayoutRepo.findById(id)
  },
  async markUnpaid(actor: Actor, id: number) {
    const p = await PayoutRepo.findById(id)
    if (!p) throw ApiError.notFound('Payout')
    await assertNotOwnerProtected(actor, { kind: 'payout', ambassadorId: p.ambassadorId })
    await PayoutRepo.update(id, { paidAt: null })
    return await PayoutRepo.findById(id)
  },
  async remove(actor: Actor, id: number) {
    const p = await PayoutRepo.findById(id)
    if (!p) throw ApiError.notFound('Payout')
    await assertNotOwnerProtected(actor, { kind: 'payout', ambassadorId: p.ambassadorId })
    for (const r of ((p.receiptPaths as any[]) ?? [])) {
      await deleteFromStorage(r.path).catch(() => {})
    }
    if (p.payslipPath) await deleteFromStorage(p.payslipPath).catch(() => {})
    await PayoutRepo.delete(id)
  },

  async addReceipt(actor: Actor, id: number, file: { name: string; mime: string; data: Buffer }) {
    const p = await PayoutRepo.findById(id)
    if (!p) throw ApiError.notFound('Payout')
    await assertNotOwnerProtected(actor, { kind: 'payout', ambassadorId: p.ambassadorId })

    const existing = (p.receiptPaths as any[]) ?? []
    if (existing.length >= 10) throw ApiError.conflict('Max 10 receipts per payout')

    const ts = Date.now()
    const safeName = file.name.replace(/[^\w.-]/g, '_').slice(0, 100)
    const relPath = `payouts/${id}/receipts/${ts}_${safeName}`
    await saveFile(relPath, file.data)

    const updated = [...existing, { path: relPath, name: file.name, size: file.data.length, mime: file.mime }]
    await PayoutRepo.update(id, { receiptPaths: updated as any })
    return { receipts: updated }
  },

  async getReceipt(_actor: Actor, id: number, index: number) {
    const p = await PayoutRepo.findById(id)
    if (!p) throw ApiError.notFound('Payout')
    // No owner-protection on read — owner-protected target's receipts are still readable by admins for audit
    const arr = (p.receiptPaths as any[]) ?? []
    const item = arr[index]
    if (!item) throw ApiError.notFound('Receipt')
    const data = await readFileFromStorage(item.path)
    return { name: item.name as string, mime: item.mime as string, data }
  },

  async deleteReceipt(actor: Actor, id: number, index: number) {
    const p = await PayoutRepo.findById(id)
    if (!p) throw ApiError.notFound('Payout')
    await assertNotOwnerProtected(actor, { kind: 'payout', ambassadorId: p.ambassadorId })
    const arr = ((p.receiptPaths as any[]) ?? []).slice()
    const item = arr[index]
    if (!item) throw ApiError.notFound('Receipt')
    await deleteFromStorage(item.path)
    arr.splice(index, 1)
    await PayoutRepo.update(id, { receiptPaths: arr as any })
  },

  async createBatch(actor: Actor & { id: number }, body: unknown) {
    const Schema = z.object({
      items: z.array(z.object({
        ambassadorId: z.number().int().positive(),
        periodMonth: z.string().regex(/^\d{4}-\d{2}$/),
      })).min(1).max(100),
      markPaid: z.boolean().optional(),
    })
    if ((actor as any).tier !== 'admin') {
      throw ApiError.forbidden('Insufficient role')
    }
    const v = Schema.parse(body)
    const created: any[] = []
    for (const item of v.items) {
      await assertNotOwnerProtected(actor, { kind: 'payout', ambassadorId: item.ambassadorId })
      const existing = await PayoutRepo.list({ ambassadorId: item.ambassadorId, month: item.periodMonth })
      if (existing.length > 0) continue

      const amb = (await useDB().select().from(schema.ambassadors).where(eq(schema.ambassadors.id, item.ambassadorId)).limit(1))[0]
      if (!amb) continue
      const role = (await useDB().select().from(schema.roles).where(eq(schema.roles.id, amb.roleId)).limit(1))[0]
      if (!role) continue

      const ownSales = await useDB().select().from(schema.sales)
        .where(and(
          eq(schema.sales.ambassadorId, item.ambassadorId),
          eq(schema.sales.status, 'confirmed'),
          like(schema.sales.date, `${item.periodMonth}%`),
        ))
      const ownTotal = ownSales.reduce((a, s) => a + Number(s.amount), 0)
      const commission = ownSales.reduce((a, s) => a + Number(s.amount) * Number(s.confirmedCommissionRate ?? 0) / 100, 0)

      let bonus = 0
      const bonusRate = role.bonusRate === null ? null : Number(role.bonusRate)
      if (bonusRate !== null && bonusRate > 0) {
        if (role.tier === 'admin') {
          const all = await useDB().select().from(schema.sales)
            .where(and(eq(schema.sales.status, 'confirmed'), like(schema.sales.date, `${item.periodMonth}%`)))
          const poolTotal = all.reduce((a, s) => a + Number(s.amount), 0)
          bonus = poolTotal * bonusRate / 100
        } else {
          const kpiThresh = role.kpiThreshold === null ? null : Number(role.kpiThreshold)
          const kpiPassed = role.requiresKpi !== 1 || (kpiThresh !== null && ownTotal >= kpiThresh)
          if (kpiPassed) bonus = ownTotal * bonusRate / 100
        }
      }

      const total = commission + bonus
      const r = await PayoutRepo.insert({
        ambassadorId: item.ambassadorId, periodMonth: item.periodMonth,
        amount: total.toFixed(2), notes: null, createdBy: actor.id,
        paidAt: v.markPaid ? new Date() : null,
        snapshotBonusRate: role.bonusRate ?? null,
        snapshotKpiThreshold: role.kpiThreshold ?? null,
        snapshotRequiresKpi: role.requiresKpi,
      })
      const id = (r as any)[0].insertId
      const created_row = await PayoutRepo.findById(id)
      if (created_row) created.push(created_row)
    }
    return { created: created.length, items: created }
  },
}
