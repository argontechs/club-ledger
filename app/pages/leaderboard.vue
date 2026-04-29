<script setup lang="ts">
import { formatRM } from '~/utils/currency'
import { currentMonth } from '~/utils/dateFormat'

const month = ref(currentMonth())
const type = ref<'all' | 'Table' | 'BGO'>('all')
const { data: rows } = useAPI<any[]>(() => `/leaderboard?month=${month.value}&type=${type.value}`)
const { data: monthList } = useAPI<string[]>('/leaderboard/months')

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function fallbackMonths(): string[] {
  const out: string[] = []
  const d = new Date()
  for (let i = 0; i < 6; i++) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    out.push(`${y}-${m}`)
    d.setMonth(d.getMonth() - 1)
  }
  return out
}

const pillMonths = computed<string[]>(() => {
  const list = (monthList.value && monthList.value.length > 0) ? monthList.value : fallbackMonths()
  // Ensure current selection is always present
  if (month.value && !list.includes(month.value)) return [month.value, ...list]
  return list.slice(0, 12)
})

function pillLabel(m: string) {
  const [y, mo] = m.split('-').map(Number)
  return `${MONTH_NAMES[mo - 1]} ${String(y).slice(2)}`
}

function selectMonth(m: string) { month.value = m }

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
    <!-- Pill month bar + type filter -->
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mr-2">Month</span>
        <button
          v-for="m in pillMonths"
          :key="m"
          type="button"
          class="px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors border"
          :class="month === m
            ? 'bg-[#E11D48] text-white border-[#E11D48]'
            : 'bg-white text-gray-600 border-[#E0E0E0] hover:border-[#E11D48]/40 hover:text-[#BE123C]'"
          @click="selectMonth(m)"
        >
          {{ pillLabel(m) }}
        </button>
      </div>

      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
