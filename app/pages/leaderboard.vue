<script setup lang="ts">
import { formatRM } from '~/utils/currency'
import { currentMonth } from '~/utils/dateFormat'

const month = ref(currentMonth())
const type = ref<'all' | 'Table' | 'BGO'>('all')
const { data: rows } = useAPI<any[]>(() => `/leaderboard?month=${month.value}&type=${type.value}`)
</script>
<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <AppInput v-model="month" type="month" />
      <AppSelect v-model="type" :options="[{value:'all',label:'All'},{value:'Table',label:'Table'},{value:'BGO',label:'BGO'}]" />
    </div>
    <AppTable :rows="rows ?? []" empty-text="No data">
      <template #head>
        <th class="p-2 w-12">#</th><th class="p-2">Name</th>
        <th class="p-2 text-right">Total</th><th class="p-2 text-right">Sales</th>
      </template>
      <template #row="{ row, index }">
        <td class="p-2">{{ index + 1 }}</td>
        <td class="p-2">{{ row.name }}</td>
        <td class="p-2 text-right">{{ formatRM(row.totalSales) }}</td>
        <td class="p-2 text-right">{{ row.saleCount }}</td>
      </template>
    </AppTable>
  </div>
</template>
