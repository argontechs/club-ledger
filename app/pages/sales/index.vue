<script setup lang="ts">
import { formatRM } from '~/utils/currency'
import { formatDate, currentMonth } from '~/utils/dateFormat'

const month = ref(currentMonth())
const { data: rows, refresh } = useAPI<any[]>(() => `/sales?month=${month.value}`)
const { data: ambassadors } = useAPI<any[]>('/ambassadors')

const showCreate = ref(false)
const m = useAPIMutation()
const confirm = useConfirm()

async function onCreate(payload: any) {
  await m.post('/sales', payload)
  showCreate.value = false
  await refresh()
}

async function confirmSale(id: number) {
  if (!await confirm('Confirm this sale? Rates will be locked.')) return
  await m.post(`/sales/${id}/confirm`); await refresh()
}
async function voidSale(id: number) {
  if (!await confirm('Void this sale?')) return
  await m.post(`/sales/${id}/void`); await refresh()
}
</script>
<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <AppInput v-model="month" type="month" />
      <AppButton @click="showCreate = true">+ New sale</AppButton>
    </div>

    <AppTable :rows="rows ?? []" empty-text="No sales for this month">
      <template #head>
        <th class="p-2">Date</th><th class="p-2">Ambassador</th><th class="p-2">Type</th>
        <th class="p-2 text-right">Amount</th><th class="p-2">Status</th><th class="p-2"></th>
      </template>
      <template #row="{ row }">
        <td class="p-2">{{ formatDate(row.date) }}</td>
        <td class="p-2">{{ ambassadors?.find(a => a.id === row.ambassadorId)?.name ?? row.ambassadorId }}</td>
        <td class="p-2">{{ row.type }}</td>
        <td class="p-2 text-right">{{ formatRM(row.amount) }}</td>
        <td class="p-2"><SaleStatusBadge :status="row.status" /></td>
        <td class="p-2 text-right space-x-2">
          <AppButton v-if="row.status === 'draft'" variant="secondary" @click="confirmSale(row.id)">Confirm</AppButton>
          <AppButton v-if="row.status !== 'voided'" variant="danger" @click="voidSale(row.id)">Void</AppButton>
        </td>
      </template>
    </AppTable>

    <AppModal :open="showCreate" title="New sale" @close="showCreate = false">
      <SaleForm v-if="ambassadors" :ambassadors="ambassadors" @submit="onCreate" />
    </AppModal>
  </div>
</template>
