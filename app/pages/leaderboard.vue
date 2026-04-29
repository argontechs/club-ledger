<script setup lang="ts">
import { formatRM } from '~/utils/currency'

const month = ref('')
const type = ref<'all' | 'Table' | 'BGO'>('all')
const { data: monthList } = useAPI<string[]>('/leaderboard/months')
const { data: rows } = useAPI<any[]>(() => month.value ? `/leaderboard?month=${month.value}&type=${type.value}` : '')

watch(monthList, (list) => {
  if (list && list.length && !month.value) month.value = list[0]
}, { immediate: true })

const medalClass = (i: number) => {
  if (i === 0) return 'bg-amber-100 text-amber-700'
  if (i === 1) return 'bg-slate-100 text-slate-500'
  if (i === 2) return 'bg-orange-100 text-orange-700'
  return 'bg-gray-50 text-gray-400'
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3">
      <AppMonthPills v-model="month" :months="monthList ?? []" label="Month" empty-text="No sales recorded yet" />

      <div class="flex flex-wrap items-center gap-1.5">
        <span class="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mr-2">Type</span>
        <button
          v-for="opt in [{ value: 'all', label: 'All' }, { value: 'Table', label: 'Table' }, { value: 'BGO', label: 'BGO' }]"
          :key="opt.value"
          type="button"
          class="px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors border"
          :class="type === opt.value
            ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
            : 'bg-white text-gray-600 border-[#E0E0E0] hover:border-gray-400'"
          @click="type = opt.value as any"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <AppTable :rows="rows ?? []" empty-text="No data">
      <template #head>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300 w-16">Rank</th>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Ambassador</th>
        <th class="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-gray-300">Sales</th>
        <th class="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-gray-300">Total</th>
      </template>
      <template #row="{ row, index }">
        <td class="px-4 py-3">
          <span
            class="inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold"
            :class="medalClass(index)"
          >{{ index + 1 }}</span>
        </td>
        <td class="px-4 py-3 text-[13px] font-medium text-[#0A0A0A]">{{ row.name }}</td>
        <td class="px-4 py-3 text-[13px] text-right text-gray-500">{{ row.saleCount }}</td>
        <td class="px-4 py-3 text-[13px] text-right font-semibold text-[#BE123C]">{{ formatRM(row.totalSales) }}</td>
      </template>
    </AppTable>
  </div>
</template>
