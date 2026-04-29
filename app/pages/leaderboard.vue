<script setup lang="ts">
import { formatRM } from '~/utils/currency'
import { currentMonth } from '~/utils/dateFormat'

const month = ref(currentMonth())
const type = ref<'all' | 'Table' | 'BGO'>('all')
const { data: rows } = useAPI<any[]>(() => `/leaderboard?month=${month.value}&type=${type.value}`)

const medalFor = (i: number) => i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : null
const medalClass = (i: number) => {
  const m = medalFor(i)
  if (m === 'gold')   return 'bg-amber-100 text-amber-700'
  if (m === 'silver') return 'bg-slate-100 text-slate-500'
  if (m === 'bronze') return 'bg-orange-100 text-orange-700'
  return 'bg-gray-50 text-gray-400'
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <input
          v-model="month"
          type="month"
          class="px-3 py-1.5 border border-[#E0E0E0] rounded-lg text-[12px] bg-white text-[#0A0A0A] outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-[#E11D48]/10 transition-colors"
        >
        <select
          v-model="type"
          class="px-3 py-1.5 border border-[#E0E0E0] rounded-lg text-[12px] bg-white text-[#0A0A0A] outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-[#E11D48]/10 transition-colors"
        >
          <option value="all">All</option>
          <option value="Table">Table</option>
          <option value="BGO">BGO</option>
        </select>
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
