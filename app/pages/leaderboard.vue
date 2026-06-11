<script setup lang="ts">
import { TrophyIcon } from '@heroicons/vue/24/outline'
import { formatRM } from '~/utils/currency'

const month = ref('')
const type = ref<string>('all')
const { data: monthList } = useAPI<string[]>('/leaderboard/months')
const { data: saleTypes } = useAPI<Array<{ name: string; isActive: number }>>('/sale-types')
const { data: rows } = useAPI<any[]>(() => month.value ? `/leaderboard?month=${month.value}&type=${encodeURIComponent(type.value)}` : '')

watch(monthList, (list) => {
  if (list && list.length && !month.value) month.value = list[0]
}, { immediate: true })

const typeOptions = computed(() => [
  { value: 'all', label: 'All' },
  ...((saleTypes.value ?? []).filter(t => t.isActive === 1).map(t => ({ value: t.name, label: t.name }))),
])

function initials(name: string | undefined | null) {
  if (!name) return '·'
  return name.split(/\s+/).map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

const podium = computed(() => (rows.value ?? []).slice(0, 3))
const rest = computed(() => (rows.value ?? []).slice(3))
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <AppMonthPills v-model="month" :months="monthList ?? []" label="Month" empty-text="No sales recorded yet" />
      <AppPillGroup v-model="type" :options="typeOptions" label="Type" />
    </div>

    <!-- Podium for top 3 -->
    <div v-if="podium.length" class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div
        v-for="(row, i) in podium"
        :key="row.ambassadorId"
        :class="[
          'relative rounded-2xl p-5 overflow-hidden border shadow-card',
          i === 0
            ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)] shadow-lift md:-translate-y-1'
            : 'bg-[var(--color-card)] border-[var(--color-border-2)]',
        ]"
      >
        <div class="relative flex items-center justify-between">
          <span
            class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-tight"
            :class="i === 0
              ? 'bg-[var(--color-brand)] text-white'
              : i === 1
              ? 'bg-[var(--color-ink)] text-white'
              : 'bg-[var(--color-surface-2)] text-[var(--color-ink-soft)]'"
          >
            <TrophyIcon class="w-3 h-3" /> Rank {{ i + 1 }}
          </span>
          <span
            class="text-[10px] uppercase tracking-[0.18em]"
            :class="i === 0 ? 'text-white/55' : 'text-[var(--color-muted-2)]'"
          >{{ row.saleCount }} {{ row.saleCount === 1 ? 'sale' : 'sales' }}</span>
        </div>
        <div class="relative mt-5 flex items-center gap-3">
          <div
            class="w-12 h-12 rounded-xl flex items-center justify-center text-[14px] font-bold shrink-0"
            :class="i === 0
              ? 'bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-ember)] text-white shadow-rose ring-2 ring-white/10'
              : 'bg-gradient-to-br from-[var(--color-ember)] to-[var(--color-brand)] text-white ring-2 ring-white'"
          >
            {{ initials(row.name) }}
          </div>
          <div class="min-w-0">
            <p
              class="font-display font-semibold text-[16px] tracking-tight truncate"
              :class="i === 0 ? 'text-white' : 'text-[var(--color-ink)]'"
            >{{ row.name }}</p>
            <p
              class="num-display text-[20px] font-semibold mt-0.5 leading-none"
              :class="i === 0 ? 'text-white' : 'text-[var(--color-ink)]'"
            >{{ formatRM(row.totalSales) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Remaining ranks -->
    <AppTable v-if="rest.length || !podium.length" :rows="rest" :empty-text="podium.length ? 'No more entries past the podium.' : 'Quiet so far. The roster builds itself as confirmed sales roll in.'">
      <template #head>
        <th class="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)] w-16">Rank</th>
        <th class="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Ambassador</th>
        <th class="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Sales</th>
        <th class="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Total</th>
      </template>
      <template #row="{ row, index }">
        <td class="px-4 py-3">
          <span class="inline-flex items-center justify-center w-8 h-7 rounded-md text-[11px] font-semibold tabular bg-[var(--color-surface-2)] text-[var(--color-muted)]">
            {{ String(index + 4).padStart(2, '0') }}
          </span>
        </td>
        <td class="px-4 py-3 text-[13px] font-medium text-[var(--color-ink)]">{{ row.name }}</td>
        <td class="px-4 py-3 text-[13px] text-right text-[var(--color-muted)] tabular">{{ row.saleCount }}</td>
        <td class="px-4 py-3 text-[13px] text-right font-semibold text-[var(--color-ink)] tabular">{{ formatRM(row.totalSales) }}</td>
      </template>
    </AppTable>
  </div>
</template>
