import { z } from 'zod'
import { PayoutRepo } from '~~/server/repositories/PayoutRepository'
import { ApiError } from '~~/server/utils/errors'
import { assertNotOwnerProtected, type Actor } from '~~/server/utils/permissions'

const CreateSchema = z.object({
  ambassadorId: z.number().int().positive(),
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.number().nonnegative(),
  notes: z.string().nullish(),
})

export const PayoutService = {
  list: PayoutRepo.list,
  async create(actor: Actor & { id: number }, body: unknown) {
    const v = CreateSchema.parse(body)
    await assertNotOwnerProtected(actor, { kind: 'payout', ambassadorId: v.ambassadorId })
    const r = await PayoutRepo.insert({
      ambassadorId: v.ambassadorId, periodMonth: v.periodMonth,
      amount: v.amount.toFixed(2), notes: v.notes ?? null, createdBy: actor.id,
    })
    return await PayoutRepo.findById((r as any)[0].insertId)
  },
  async remove(actor: Actor, id: number) {
    const p = await PayoutRepo.findById(id)
    if (!p) throw ApiError.notFound('Payout')
    await assertNotOwnerProtected(actor, { kind: 'payout', ambassadorId: p.ambassadorId })
    await PayoutRepo.delete(id)
  },
}
