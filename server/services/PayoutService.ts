import { z } from 'zod'
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
  async create(actor: Actor & { id: number }, body: unknown) {
    const v = CreateSchema.parse(body)
    await assertNotOwnerProtected(actor, { kind: 'payout', ambassadorId: v.ambassadorId })
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
}
