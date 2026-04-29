<script setup lang="ts">
import { formatRM } from '~/utils/currency'
import { currentMonth } from '~/utils/dateFormat'

const month = ref(currentMonth())
const { data: rows } = useAPI<any[]>(() => `/commissions?month=${month.value}`)
</script>
<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3">
      <AppInput v-model="month" type="month" />
    </div>
    <AppTable :rows="rows ?? []" empty-text="No data">
      <template #head>
        <th class="p-2">Name</th><th class="p-2">Role</th>
        <th class="p-2 text-right">Own sales</th><th class="p-2 text-right">Own commission</th>
        <th class="p-2 text-right">Bonus</th><th class="p-2 text-right">Total</th>
      </template>
      <template #row="{ row }">
        <td class="p-2">{{ row.name }}</td>
        <td class="p-2">{{ row.role }}</td>
        <td class="p-2 text-right">{{ formatRM(row.ownSales) }}</td>
        <td class="p-2 text-right">{{ formatRM(row.ownCommission) }}</td>
        <td class="p-2 text-right">{{ formatRM(row.bonus) }}</td>
        <td class="p-2 text-right font-semibold">{{ formatRM(row.total) }}</td>
      </template>
    </AppTable>
  </div>
</template>
