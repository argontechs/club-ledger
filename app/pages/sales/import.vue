<script setup lang="ts">
import { formatRM } from '~/utils/currency'
import { formatDate } from '~/utils/dateFormat'
import { useAuthStore } from '~/stores/auth'
definePageMeta({ middleware: ['role'] })

const { data: ambassadors } = useAPI<any[]>('/ambassadors')

const file = ref<File | null>(null)
const dryRun = ref<any | null>(null)
const ambassadorId = ref<number | null>(null)
const status = ref<'draft' | 'confirmed'>('draft')
const error = ref('')
const importing = ref(false)
const result = ref<any | null>(null)

async function parse() {
  error.value = ''
  if (!file.value) return
  const fd = new FormData(); fd.set('file', file.value)
  try {
    const auth = useAuthStore()
    dryRun.value = await $fetch('/api/v1/sales/import', {
      method: 'POST', body: fd,
      headers: { authorization: auth.token ? `Bearer ${auth.token}` : '' },
    })
  } catch (e: any) {
    error.value = e?.data?.error?.message || 'Parse failed'
  }
}

const dupSet = computed(() => new Set<string>(dryRun.value?.duplicates ?? []))
const importableRows = computed(() =>
  (dryRun.value?.rows ?? []).filter((r: any) => !dupSet.value.has(r.externalOrderId)))

const m = useAPIMutation()
async function commit() {
  if (!ambassadorId.value || !dryRun.value) return
  importing.value = true
  try {
    result.value = await m.post('/sales/import-commit', {
      ambassadorId: ambassadorId.value, status: status.value, rows: importableRows.value,
    })
  } finally { importing.value = false }
}
</script>
<template>
  <div class="space-y-4">
    <h1 class="text-xl font-semibold">Import sales from PDF</h1>

    <AppCard class="space-y-3">
      <input type="file" accept="application/pdf" @change="file = ($event.target as HTMLInputElement).files?.[0] ?? null" />
      <AppButton :disabled="!file" @click="parse">Parse PDF</AppButton>
      <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>
    </AppCard>

    <AppCard v-if="dryRun">
      <p class="text-sm">PDF total: <b>{{ formatRM(dryRun.headerTotal) }}</b></p>
      <p class="text-sm">Parsed total: <b>{{ formatRM(dryRun.parsedTotal) }}</b>
        <span v-if="Math.abs(dryRun.parsedTotal - dryRun.headerTotal) > 0.05" class="text-amber-600 ml-2">⚠ mismatch</span></p>
      <p class="text-sm">PDF hint: <i>{{ dryRun.ambassadorHint || 'unknown' }}</i></p>
      <p class="text-sm">{{ dryRun.rows.length }} rows parsed, {{ dryRun.duplicates.length }} duplicate(s) will be skipped.</p>

      <div class="mt-3 grid grid-cols-2 gap-3">
        <AppSelect v-model="ambassadorId" label="Assign to ambassador (required)"
          :options="(ambassadors ?? []).map(a => ({ value: a.id, label: a.name }))" />
        <AppSelect v-model="status" label="Import as"
          :options="[{ value: 'draft', label: 'Draft' }, { value: 'confirmed', label: 'Confirmed' }]" />
      </div>

      <div class="mt-3">
        <AppButton :disabled="!ambassadorId || importing" @click="commit">
          Import {{ importableRows.length }} row(s)
        </AppButton>
      </div>
    </AppCard>

    <AppCard v-if="result">
      <p>Imported: {{ result.imported }}, skipped: {{ result.skipped }}</p>
    </AppCard>

    <AppTable v-if="dryRun" :rows="dryRun.rows" empty-text="No rows">
      <template #head>
        <th class="p-2">Date</th><th class="p-2">Order</th><th class="p-2">Table</th>
        <th class="p-2 text-right">Amount</th><th class="p-2">Status</th>
      </template>
      <template #row="{ row }">
        <td class="p-2">{{ formatDate(row.date) }}</td>
        <td class="p-2">{{ row.externalOrderId }}</td>
        <td class="p-2">{{ row.tableNumber }}</td>
        <td class="p-2 text-right">{{ formatRM(row.amount) }}</td>
        <td class="p-2">
          <span v-if="dupSet.has(row.externalOrderId)" class="text-slate-400 text-xs">duplicate, skipped</span>
          <span v-else class="text-emerald-700 text-xs">will import</span>
        </td>
      </template>
    </AppTable>
  </div>
</template>
