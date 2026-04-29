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

async function add() {
  if (!ambassadorId.value) return
  await m.post('/payouts', { ambassadorId: ambassadorId.value, periodMonth: month.value, amount: Number(amount.value), notes: notes.value || null })
  showAdd.value = false; amount.value = 0; notes.value = ''
  await refresh()
}

async function remove(id: number) {
  await m.del(`/payouts/${id}`); await refresh()
}
</script>
<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <AppInput v-model="month" type="month" />
      <AppButton @click="showAdd = true">+ Record payout</AppButton>
    </div>
    <AppTable :rows="rows ?? []" empty-text="No payouts">
      <template #head>
        <th class="p-2">Ambassador</th><th class="p-2">Month</th>
        <th class="p-2 text-right">Amount</th><th class="p-2">Paid at</th><th class="p-2"></th>
      </template>
      <template #row="{ row }">
        <td class="p-2">{{ ambassadors?.find(a => a.id === row.ambassadorId)?.name ?? row.ambassadorId }}</td>
        <td class="p-2">{{ row.periodMonth }}</td>
        <td class="p-2 text-right">{{ formatRM(row.amount) }}</td>
        <td class="p-2">{{ row.paidAt ? formatDate(row.paidAt.slice(0,10)) : '-' }}</td>
        <td class="p-2 text-right"><AppButton variant="danger" @click="remove(row.id)">Delete</AppButton></td>
      </template>
    </AppTable>

    <AppModal :open="showAdd" title="Record payout" @close="showAdd = false">
      <div class="space-y-3">
        <AppSelect v-model="ambassadorId" label="Ambassador"
          :options="(ambassadors ?? []).map(a => ({ value: a.id, label: a.name }))" />
        <AppInput v-model="amount" type="number" label="Amount (RM)" />
        <AppInput v-model="notes" label="Notes (optional)" />
        <AppButton @click="add">Save</AppButton>
      </div>
    </AppModal>
  </div>
</template>
