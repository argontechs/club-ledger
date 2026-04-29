<script setup lang="ts">
import { formatRM } from '~/utils/currency'

const month = ref('')
const { data: monthList } = useAPI<string[]>('/commissions/months')
const { data: rows } = useAPI<any[]>(() => month.value ? `/commissions?month=${month.value}` : '')

watch(monthList, (list) => {
  if (list && list.length && !month.value) month.value = list[0]
}, { immediate: true })

const roleTone = (r: string) => {
  if (r === 'owner' || r === 'admin') return 'rose'
  if (r === 'leader') return 'amber'
  return 'slate'
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3">
      <p class="text-[13px] text-gray-400">
        Commissions for <span class="text-gray-600 font-semibold">{{ month || '—' }}</span>
      </p>
      <AppMonthPills v-model="month" :months="monthList ?? []" label="Month" empty-text="No sales recorded yet" />
    </div>

    <AppTable :rows="rows ?? []" empty-text="No data">
      <template #head>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Name</th>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Role</th>
        <th class="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-gray-300">Own sales</th>
        <th class="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-gray-300">Own commission</th>
        <th class="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-gray-300">Bonus</th>
        <th class="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-gray-300">Total</th>
      </template>
      <template #row="{ row }">
        <td class="px-4 py-3 text-[13px] font-medium text-[#0A0A0A]">{{ row.name }}</td>
        <td class="px-4 py-3"><AppBadge :tone="roleTone(row.role)">{{ row.role }}</AppBadge></td>
        <td class="px-4 py-3 text-[13px] text-right text-gray-600">{{ formatRM(row.ownSales) }}</td>
        <td class="px-4 py-3 text-[13px] text-right text-gray-600">{{ formatRM(row.ownCommission) }}</td>
        <td class="px-4 py-3 text-[13px] text-right text-gray-600">{{ formatRM(row.bonus) }}</td>
        <td class="px-4 py-3 text-[13px] text-right font-semibold text-[#BE123C]">{{ formatRM(row.total) }}</td>
      </template>
    </AppTable>
  </div>
</template>
