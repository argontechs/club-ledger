<script setup lang="ts">
import { formatRM } from '~/utils/currency'
import { formatDate } from '~/utils/dateFormat'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()

const month = ref('')
const ambassadorFilter = ref<number | ''>('')
const salesUrl = computed(() => {
  if (!month.value) return ''
  const base = `/sales?month=${month.value}`
  return ambassadorFilter.value ? `${base}&ambassador_id=${ambassadorFilter.value}` : base
})
const { data: rows, refresh } = useAPI<any[]>(() => salesUrl.value)
const { data: ambassadors } = useAPI<any[]>('/ambassadors')
const { data: monthList, refresh: refreshMonths } = useAPI<string[]>('/sales/months')

watch(monthList, (list) => {
  if (list && list.length && !month.value) month.value = list[0]
}, { immediate: true })

const page = ref(1)
const perPage = ref(25)
watch([month, ambassadorFilter], () => { page.value = 1 })

const pagedSales = computed(() => {
  const list = rows.value ?? []
  const start = (page.value - 1) * perPage.value
  return list.slice(start, start + perPage.value)
})

const summary = computed(() => {
  const list = rows.value ?? []
  const confirmed = list.filter(r => r.status === 'confirmed')
  const drafts = list.filter(r => r.status === 'draft')
  const total = confirmed.reduce((a, r) => a + Number(r.amount || 0), 0)
  const ambIds = new Set(list.map(r => r.ambassadorId))
  return [
    { label: 'Confirmed', value: confirmed.length, tone: 'ink' as const },
    { label: 'Total this month', prefix: 'RM', value: formatRM(total).replace(/^RM\s*/, '') },
    { label: 'Active ambassadors', value: ambIds.size },
    { label: 'Drafts pending', value: drafts.length },
  ]
})

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
    const created = await m.post<{ date: string }>('/sales', payload)
    showCreate.value = false
    await refreshMonths()
    const createdMonth = created?.date?.slice(0, 7)
    if (createdMonth && createdMonth !== month.value) {
      // Jumping months triggers the salesUrl watcher → list reloads automatically
      month.value = createdMonth
    } else {
      await refresh()
    }
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
  <div class="space-y-6">
    <!-- Filter row -->
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <AppMonthPills v-model="month" :months="monthList ?? []" label="Month" empty-text="No sales recorded yet" />
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

    <AppStatStrip :stats="summary" />

    <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
      <span class="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Ambassador</span>
      <div class="sm:min-w-[220px]">
        <AppSelect v-model="ambassadorFilter" :options="ambassadorFilterOptions" />
      </div>
    </div>

    <AppTable :rows="pagedSales" empty-text="Nothing recorded for this period yet. Drop a POS PDF onto Import, or click + New sale.">
      <template #head>
        <th class="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Date</th>
        <th class="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Ambassador</th>
        <th class="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Type</th>
        <th class="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Table</th>
        <th class="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Amount</th>
        <th class="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Status</th>
        <th class="px-4 py-3" />
      </template>
      <template #row="{ row }">
        <td class="px-4 py-3 text-[13px] text-[var(--color-muted)] tabular">{{ formatDate(row.date) }}</td>
        <td class="px-4 py-3 text-[13px] font-medium text-[var(--color-ink)]">
          {{ ambassadors?.find(a => a.id === row.ambassadorId)?.name ?? row.ambassadorId }}
        </td>
        <td class="px-4 py-3 text-[13px] text-[var(--color-muted)]">{{ row.type }}</td>
        <td class="px-4 py-3 text-[13px] text-[var(--color-muted)] tabular">{{ row.tableNumber || '—' }}</td>
        <td class="px-4 py-3 text-[13px] text-right font-semibold text-[var(--color-ink)] tabular">{{ formatRM(row.amount) }}</td>
        <td class="px-4 py-3"><SaleStatusBadge :status="row.status" /></td>
        <td class="px-4 py-3 text-right">
          <div class="inline-flex gap-1.5">
            <AppButton v-if="row.status === 'draft'" size="sm" variant="secondary" @click="confirmSale(row.id)">Confirm</AppButton>
            <AppButton v-if="row.status !== 'voided'" size="sm" variant="danger" @click="voidSale(row.id)">Void</AppButton>
          </div>
        </td>
      </template>
    </AppTable>

    <AppPagination
      v-if="(rows ?? []).length > 0"
      :total="(rows ?? []).length"
      :page="page"
      :per-page="perPage"
      @update:page="page = $event"
      @update:per-page="perPage = $event"
    />

    <AppModal :open="showCreate" title="New sale" @close="showCreate = false">
      <SaleForm v-if="ambassadors && showCreate" :ambassadors="ambassadors" @submit="onCreate" />
    </AppModal>
  </div>
</template>
