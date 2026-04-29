<script setup lang="ts">
import { currentMonth } from '~/utils/dateFormat'
import { formatRM } from '~/utils/currency'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const month = ref(currentMonth())
const { data: rows } = useAPI<any[]>(() => `/commissions?month=${month.value}`)
const me = computed(() => rows.value?.find(r => r.userId === auth.user?.id))
const totalSales = computed(() => (rows.value ?? []).reduce((a, r) => a + r.ownSales, 0))
</script>
<template>
  <div class="grid grid-cols-3 gap-4">
    <AppCard>
      <p class="text-slate-500 text-sm">Month</p>
      <p class="text-2xl font-semibold">{{ month }}</p>
    </AppCard>
    <AppCard>
      <p class="text-slate-500 text-sm">Total club sales</p>
      <p class="text-2xl font-semibold">{{ formatRM(totalSales) }}</p>
    </AppCard>
    <AppCard>
      <p class="text-slate-500 text-sm">My commission</p>
      <p class="text-2xl font-semibold">{{ formatRM(me?.total ?? 0) }}</p>
    </AppCard>
  </div>
</template>
