<script setup lang="ts">
import { formatRM } from '~/utils/currency'
import { currentMonth, formatDate } from '~/utils/dateFormat'
definePageMeta({ middleware: ['role'] })

const month = ref(currentMonth())
const { data: rows, refresh } = useAPI<any[]>(() => `/payouts?month=${month.value}`)
const { data: ambassadors } = useAPI<any[]>('/ambassadors')

const showAdd = ref(false)
const ambassadorId = ref<number | null>(null)
const amount = ref<number>(0)
const notes = ref('')
const m = useAPIMutation()
const confirm = useConfirm()

async function add() {
  if (!ambassadorId.value) return
  await m.post('/payouts', {
    ambassadorId: ambassadorId.value, periodMonth: month.value,
    amount: Number(amount.value), notes: notes.value || null,
  })
  showAdd.value = false; amount.value = 0; notes.value = ''
  await refresh()
}

async function remove(id: number) {
  if (!await confirm('Delete this payout?')) return
  await m.del(`/payouts/${id}`); await refresh()
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <input
        v-model="month"
        type="month"
        class="w-full sm:w-auto px-3 py-1.5 border border-[#E0E0E0] rounded-lg text-[12px] bg-white text-[#0A0A0A] outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-[#E11D48]/10 transition-colors"
      >
      <AppButton class="w-full sm:w-auto" @click="showAdd = true">+ Record payout</AppButton>
    </div>

    <AppTable :rows="rows ?? []" empty-text="No payouts for this month">
      <template #head>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Ambassador</th>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Period</th>
        <th class="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-gray-300">Amount</th>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Paid at</th>
        <th class="px-4 py-2.5" />
      </template>
      <template #row="{ row }">
        <td class="px-4 py-3 text-[13px] font-medium text-[#0A0A0A]">
          {{ ambassadors?.find(a => a.id === row.ambassadorId)?.name ?? row.ambassadorId }}
        </td>
        <td class="px-4 py-3 text-[13px] text-gray-500">{{ row.periodMonth }}</td>
        <td class="px-4 py-3 text-[13px] text-right font-semibold text-[#0A0A0A]">{{ formatRM(row.amount) }}</td>
        <td class="px-4 py-3 text-[13px] text-gray-500">{{ row.paidAt ? formatDate(row.paidAt.slice(0, 10)) : '-' }}</td>
        <td class="px-4 py-3 text-right">
          <AppButton size="sm" variant="danger" @click="remove(row.id)">Delete</AppButton>
        </td>
      </template>
    </AppTable>

    <AppModal :open="showAdd" title="Record payout" @close="showAdd = false">
      <div class="space-y-3">
        <AppSelect
          v-model="ambassadorId"
          label="Ambassador"
          :options="(ambassadors ?? []).map(a => ({ value: a.id, label: a.name }))"
        />
        <AppInput v-model="amount" type="number" label="Amount (RM)" />
        <AppInput v-model="notes" label="Notes (optional)" />
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="showAdd = false">Cancel</AppButton>
        <AppButton @click="add">Save payout</AppButton>
      </template>
    </AppModal>
  </div>
</template>
