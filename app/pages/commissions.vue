<script setup lang="ts">
import { formatRM } from '~/utils/currency'

const month = ref('')
const ambassadorFilter = ref<number | ''>('')
const { data: monthList } = useAPI<string[]>('/commissions/months')
const { data: rows } = useAPI<any[]>(() => month.value ? `/commissions?month=${month.value}` : '')
const { data: ambassadors } = useAPI<any[]>('/ambassadors')

watch(monthList, (list) => {
  if (list && list.length && !month.value) month.value = list[0]
}, { immediate: true })

const monthLabel = computed(() => {
  if (!month.value) return '—'
  const [y, m] = month.value.split('-').map(Number)
  return new Date(y, m - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
})

const filteredRows = computed(() => {
  const list = rows.value ?? []
  if (!ambassadorFilter.value) return list
  return list.filter(r => r.ambassadorId === Number(ambassadorFilter.value))
})

const summary = computed(() => {
  const list = filteredRows.value
  const totalOwnSales = list.reduce((a, r) => a + Number(r.ownSales || 0), 0)
  const totalCommission = list.reduce((a, r) => a + Number(r.total || 0), 0)
  const totalBonus = list.reduce((a, r) => a + Number(r.bonus || 0), 0)
  return [
    { label: 'Earners', value: list.length, tone: 'ink' as const },
    { label: 'Sales pool', prefix: 'RM', value: formatRM(totalOwnSales).replace(/^RM\s*/, '') },
    { label: 'Commissions', prefix: 'RM', value: formatRM(totalCommission).replace(/^RM\s*/, '') },
    { label: 'Owner+admin bonus', prefix: 'RM', value: formatRM(totalBonus).replace(/^RM\s*/, '') },
  ]
})

const ambassadorFilterOptions = computed(() => [
  { value: '', label: 'All ambassadors' },
  ...((ambassadors.value ?? []).map(a => ({ value: a.id, label: a.name }))),
])

const roleTone = (r: string) => {
  if (r === 'owner' || r === 'admin') return 'rose'
  if (r === 'leader') return 'amber'
  return 'slate'
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-2)]">Commissions for</p>
        <p class="font-display text-[18px] font-semibold text-[var(--color-ink)] tracking-tight">{{ monthLabel }}</p>
      </div>
      <AppMonthPills v-model="month" :months="monthList ?? []" label="Month" empty-text="No sales recorded yet" />
    </div>

    <AppStatStrip :stats="summary" />

    <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
      <span class="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Ambassador</span>
      <div class="sm:min-w-[220px]">
        <AppSelect v-model="ambassadorFilter" :options="ambassadorFilterOptions" />
      </div>
    </div>

    <AppTable :rows="filteredRows" empty-text="Commissions appear once sales are confirmed.">
      <template #head>
        <th class="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Name</th>
        <th class="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Role</th>
        <th class="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Own sales</th>
        <th class="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Own commission</th>
        <th class="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Bonus</th>
        <th class="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Total</th>
      </template>
      <template #row="{ row }">
        <td class="px-4 py-3 text-[13px] font-medium text-[var(--color-ink)]">{{ row.name }}</td>
        <td class="px-4 py-3"><AppBadge :tone="roleTone(row.role)">{{ row.role }}</AppBadge></td>
        <td class="px-4 py-3 text-[13px] text-right text-[var(--color-muted)] tabular">{{ formatRM(row.ownSales) }}</td>
        <td class="px-4 py-3 text-[13px] text-right text-[var(--color-muted)] tabular">{{ formatRM(row.ownCommission) }}</td>
        <td class="px-4 py-3 text-[13px] text-right text-[var(--color-muted)] tabular">{{ formatRM(row.bonus) }}</td>
        <td class="px-4 py-3 text-[13px] text-right font-semibold text-[var(--color-brand-dark)] tabular">{{ formatRM(row.total) }}</td>
      </template>
    </AppTable>
  </div>
</template>
