<script setup lang="ts">
import { formatRM } from '~/utils/currency'
import { formatDate, currentMonth } from '~/utils/dateFormat'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()

const month = ref(currentMonth())
const ambassadorFilter = ref<number | ''>('')
const salesUrl = computed(() => {
  const base = `/sales?month=${month.value}`
  return ambassadorFilter.value ? `${base}&ambassador_id=${ambassadorFilter.value}` : base
})
const { data: rows, refresh } = useAPI<any[]>(() => salesUrl.value)
const { data: ambassadors } = useAPI<any[]>('/ambassadors')

const showCreate = ref(false)
const m = useAPIMutation()
const confirm = useConfirm()
const toast = useToast()

const ambassadorFilterOptions = computed(() => [
  { value: '', label: 'All ambassadors' },
  ...((ambassadors.value ?? []).map(a => ({ value: a.id, label: a.name }))),
])

async function openCreate() {
  showCreate.value = true
}

async function onCreate(payload: any) {
  try {
    await m.post('/sales', payload)
    showCreate.value = false
    await refresh()
    toast.success('Sale created')
  } catch (e: any) {
    toast.error(e?.data?.error?.message || 'Failed to create sale')
  }
}

async function confirmSale(id: number) {
  if (!await confirm('Confirm this sale? Rates will be locked.', { confirmText: 'Confirm sale' })) return
  try {
    await m.post(`/sales/${id}/confirm`)
    await refresh()
    toast.success('Sale confirmed')
  } catch (e: any) {
    toast.error(e?.data?.error?.message || 'Failed to confirm sale')
  }
}
async function voidSale(id: number) {
  if (!await confirm('Void this sale?', { tone: 'danger', confirmText: 'Void' })) return
  try {
    await m.post(`/sales/${id}/void`)
    await refresh()
    toast.success('Sale voided')
  } catch (e: any) {
    toast.error(e?.data?.error?.message || 'Failed to void sale')
  }
}

async function bulkConfirmDrafts() {
  const ambName = ambassadorFilter.value
    ? ambassadors.value?.find(a => a.id === ambassadorFilter.value)?.name
    : null
  const scope = ambName ? ` for ${ambName}` : ''
  if (!await confirm(
    `Confirm all draft sales for ${month.value}${scope}?`,
    { confirmText: 'Confirm all', tone: 'primary' },
  )) return
  try {
    const body: any = { month: month.value }
    if (ambassadorFilter.value) body.ambassadorId = ambassadorFilter.value
    const r = await m.post<{ confirmed: number; failed: number; total: number }>(
      '/sales/confirm-drafts',
      body,
    )
    await refresh()
    if (r.failed > 0) {
      toast.info(`Confirmed ${r.confirmed} of ${r.total} (${r.failed} failed)`)
    } else if (r.confirmed === 0) {
      toast.info('No drafts to confirm')
    } else {
      toast.success(`Confirmed ${r.confirmed} draft(s)`)
    }
  } catch (e: any) {
    toast.error(e?.data?.error?.message || 'Failed to confirm drafts')
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Filter row -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
        <AppMonthPicker v-model="month" />
        <AppSelect v-model="ambassadorFilter" :options="ambassadorFilterOptions" />
      </div>
      <div class="flex flex-col sm:flex-row gap-2">
        <AppButton
          v-if="auth.isAdminOrOwner"
          variant="secondary"
          class="w-full sm:w-auto"
          @click="bulkConfirmDrafts"
        >
          Confirm all drafts
        </AppButton>
        <AppButton class="w-full sm:w-auto" @click="openCreate">+ New sale</AppButton>
      </div>
    </div>

    <AppTable :rows="rows ?? []" empty-text="No sales for this month">
      <template #head>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Date</th>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Ambassador</th>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Type</th>
        <th class="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-gray-300">Amount</th>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Status</th>
        <th class="px-4 py-2.5" />
      </template>
      <template #row="{ row }">
        <td class="px-4 py-3 text-[13px] text-gray-600">{{ formatDate(row.date) }}</td>
        <td class="px-4 py-3 text-[13px] font-medium text-[#0A0A0A]">
          {{ ambassadors?.find(a => a.id === row.ambassadorId)?.name ?? row.ambassadorId }}
        </td>
        <td class="px-4 py-3 text-[13px] text-gray-500">{{ row.type }}</td>
        <td class="px-4 py-3 text-[13px] text-right font-semibold text-[#0A0A0A]">{{ formatRM(row.amount) }}</td>
        <td class="px-4 py-3"><SaleStatusBadge :status="row.status" /></td>
        <td class="px-4 py-3 text-right">
          <div class="inline-flex gap-1.5">
            <AppButton v-if="row.status === 'draft'" size="sm" variant="secondary" @click="confirmSale(row.id)">Confirm</AppButton>
            <AppButton v-if="row.status !== 'voided'" size="sm" variant="danger" @click="voidSale(row.id)">Void</AppButton>
          </div>
        </td>
      </template>
    </AppTable>

    <AppModal :open="showCreate" title="New sale" @close="showCreate = false">
      <SaleForm v-if="ambassadors && showCreate" :ambassadors="ambassadors" @submit="onCreate" />
    </AppModal>
  </div>
</template>
