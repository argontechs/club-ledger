<script setup lang="ts">
import { formatRM } from '~/utils/currency'
import { formatDate } from '~/utils/dateFormat'
import { useAuthStore } from '~/stores/auth'
import {
  ArrowUpTrayIcon, DocumentArrowDownIcon, CheckCircleIcon,
  DocumentTextIcon, XMarkIcon,
} from '@heroicons/vue/24/outline'
definePageMeta({ middleware: ['role'] })

const { data: ambassadors } = useAPI<any[]>('/ambassadors')

const file = ref<File | null>(null)
const dryRun = ref<any | null>(null)
const rows = ref<any[]>([])  // mutable copy of dryRun.rows with per-row ambassadorId
const bulkAmbassadorId = ref<number | ''>('')
const status = ref<'draft' | 'confirmed'>('draft')
const error = ref('')
const importing = ref(false)
const result = ref<any | null>(null)
const isDragging = ref(false)

const ambassadorOptions = computed(() => [
  { value: '', label: '— Select —' },
  ...(ambassadors.value ?? []).map(a => ({ value: a.id, label: a.name })),
])

function onPickFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0] ?? null
  file.value = f
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  const f = e.dataTransfer?.files?.[0] ?? null
  if (f && f.type === 'application/pdf') file.value = f
}

async function parse() {
  error.value = ''
  if (!file.value) return
  const fd = new FormData(); fd.set('file', file.value)
  try {
    const auth = useAuthStore()
    const r = await $fetch<any>('/api/v1/sales/import', {
      method: 'POST', body: fd,
      headers: { authorization: auth.token ? `Bearer ${auth.token}` : '' },
    })
    dryRun.value = r
    rows.value = (r.rows ?? []).map((x: any) => ({ ...x, ambassadorId: '' as number | '' }))
    // Try to auto-match the PDF hint to an ambassador
    if (r.ambassadorHint && ambassadors.value) {
      const hint = String(r.ambassadorHint).toLowerCase()
      const match = ambassadors.value.find(a =>
        hint.includes(String(a.name).toLowerCase()) || String(a.name).toLowerCase().includes(hint))
      if (match) bulkAmbassadorId.value = match.id
    }
  } catch (e: any) {
    error.value = e?.data?.error?.message || 'Parse failed'
  }
}

const dupSet = computed(() => new Set<string>(dryRun.value?.duplicates ?? []))

function applyBulk() {
  if (!bulkAmbassadorId.value) return
  for (const r of rows.value) {
    if (!dupSet.value.has(r.externalOrderId)) r.ambassadorId = bulkAmbassadorId.value
  }
}

const importableRows = computed(() =>
  rows.value.filter((r: any) => !dupSet.value.has(r.externalOrderId)))

const allAssigned = computed(() =>
  importableRows.value.length > 0 && importableRows.value.every(r => !!r.ambassadorId))

const m = useAPIMutation()
const toast = useToast()
async function commit() {
  if (!dryRun.value || importableRows.value.length === 0) return
  if (!allAssigned.value) {
    toast.error('Assign every importable row to an ambassador first')
    return
  }
  importing.value = true
  try {
    result.value = await m.post('/sales/import-commit', {
      status: status.value,
      rows: importableRows.value.map(r => ({
        date: r.date,
        externalOrderId: r.externalOrderId,
        tableNumber: r.tableNumber,
        amount: r.amount,
        ambassadorId: Number(r.ambassadorId),
      })),
    })
    toast.success(`Imported ${result.value?.imported ?? 0} sale(s)`)
  } catch (e: any) {
    toast.error(e?.data?.error?.message || 'Import failed')
  } finally { importing.value = false }
}

const totalsMismatch = computed(() =>
  dryRun.value && Math.abs(dryRun.value.parsedTotal - dryRun.value.headerTotal) > 0.05)
</script>

<template>
  <div class="space-y-5 max-w-4xl mx-auto">
    <!-- Step 1: drop -->
    <div class="bg-white border border-[#E8E8EC] rounded-2xl p-5 shadow-sm">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-[12px] font-bold uppercase tracking-wide text-gray-400">Step 1 · Upload PDF</h3>
        <p class="text-[11px] text-gray-400 hidden sm:block">PDF only · max 20MB</p>
      </div>

      <label
        v-if="!file"
        class="flex flex-col items-center justify-center gap-3 px-4 py-12 border-2 border-dashed rounded-xl cursor-pointer transition-colors"
        :class="isDragging ? 'border-[#E11D48] bg-[#E11D4808]' : 'border-[#E0E0E0] hover:border-[#E11D48] hover:bg-[#FAFAFA]'"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onDrop"
      >
        <div class="w-12 h-12 rounded-full bg-[#E11D481A] flex items-center justify-center">
          <ArrowUpTrayIcon class="w-6 h-6 text-[#E11D48]" />
        </div>
        <div class="text-center">
          <p class="text-[14px] font-semibold text-[#0A0A0A]">
            <span class="text-[#BE123C]">Click to choose</span>
            <span class="text-gray-600"> or drag &amp; drop</span>
          </p>
          <p class="text-[12px] text-gray-400 mt-1">Drop your Nono Club POS export here</p>
        </div>
        <input type="file" accept="application/pdf" class="hidden" @change="onPickFile">
      </label>

      <div
        v-else
        class="flex items-center gap-3 px-4 py-4 border border-[#E0E0E0] rounded-xl bg-[#FAFAFA]"
      >
        <div class="w-10 h-10 rounded-lg bg-[#E11D481A] flex items-center justify-center shrink-0">
          <DocumentTextIcon class="w-5 h-5 text-[#E11D48]" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-[13px] font-semibold text-[#0A0A0A] truncate">{{ file.name }}</p>
          <p class="text-[11px] text-gray-500">{{ (file.size / 1024).toFixed(0) }} KB · ready to parse</p>
        </div>
        <button
          type="button"
          class="w-8 h-8 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 shrink-0"
          aria-label="Remove file"
          @click="file = null; dryRun = null; rows = []; result = null; error = ''"
        >
          <XMarkIcon class="w-4 h-4" />
        </button>
      </div>

      <p v-if="error" class="mt-3 text-[12px] text-red-600">{{ error }}</p>

      <div class="mt-4 flex flex-col sm:flex-row sm:justify-end gap-2">
        <AppButton class="w-full sm:w-auto" :disabled="!file" @click="parse">
          <DocumentArrowDownIcon class="w-4 h-4" />
          Parse PDF
        </AppButton>
      </div>
    </div>

    <!-- Step 2: summary -->
    <div v-if="dryRun" class="bg-white border border-[#E8E8EC] rounded-2xl p-5 shadow-sm">
      <h3 class="text-[12px] font-bold uppercase tracking-wide text-gray-400 mb-3">Step 2 · Review</h3>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AppCard label="PDF Total" prefix="RM " :value="formatRM(dryRun.headerTotal).replace(/^RM\s*/, '')" />
        <AppCard label="Parsed Total" prefix="RM " :value="formatRM(dryRun.parsedTotal).replace(/^RM\s*/, '')" />
        <AppCard label="Rows Parsed" :value="dryRun.rows.length" />
        <AppCard label="Duplicates" :value="dryRun.duplicates.length" />
      </div>

      <p v-if="totalsMismatch" class="mt-3 text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
        Header and parsed totals don't match. Double-check the PDF.
      </p>

      <p v-if="dryRun.ambassadorHint" class="mt-3 text-[12px] text-gray-500">
        PDF hint: <span class="font-medium text-gray-700">{{ dryRun.ambassadorHint }}</span>
      </p>
    </div>

    <!-- Step 3: assign + import -->
    <div v-if="dryRun" class="bg-white border border-[#E8E8EC] rounded-2xl p-5 shadow-sm">
      <h3 class="text-[12px] font-bold uppercase tracking-wide text-gray-400 mb-3">Step 3 · Assign &amp; import</h3>

      <div class="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 md:items-end">
        <AppSelect
          v-model="bulkAmbassadorId"
          label="Set all rows to"
          :options="ambassadorOptions"
        />
        <AppButton variant="secondary" class="w-full md:w-auto md:mb-0.5" :disabled="!bulkAmbassadorId" @click="applyBulk">
          Apply to all
        </AppButton>
        <AppSelect
          v-model="status"
          label="Import as"
          :options="[{ value: 'draft', label: 'Draft' }, { value: 'confirmed', label: 'Confirmed' }]"
        />
      </div>

      <p class="mt-3 text-[12px] text-gray-500">
        You can also pick a different ambassador per row in the table below.
      </p>

      <div class="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
        <p v-if="!allAssigned && importableRows.length > 0" class="text-[12px] text-amber-700 sm:mr-auto">
          {{ importableRows.filter(r => !r.ambassadorId).length }} row(s) still need an ambassador.
        </p>
        <AppButton class="w-full sm:w-auto" :disabled="!allAssigned || importing || importableRows.length === 0" @click="commit">
          {{ importing ? 'Importing…' : `Import ${importableRows.length} row(s)` }}
        </AppButton>
      </div>
    </div>

    <!-- Result -->
    <div
      v-if="result"
      class="bg-white border border-[#E8E8EC] rounded-2xl p-5 shadow-sm flex items-start gap-3"
    >
      <CheckCircleIcon class="w-6 h-6 text-emerald-600 shrink-0" />
      <div>
        <p class="text-[13px] font-semibold text-[#0A0A0A]">Import complete</p>
        <p class="text-[12px] text-gray-500 mt-0.5">
          Imported {{ result.imported }}, skipped {{ result.skipped }}.
        </p>
      </div>
    </div>

    <!-- Rows table with per-row assignment -->
    <AppTable v-if="dryRun" :rows="rows" empty-text="No rows">
      <template #head>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Date</th>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Order</th>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Table</th>
        <th class="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-gray-300">Amount</th>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300 w-[200px]">Ambassador</th>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Status</th>
      </template>
      <template #row="{ row }">
        <td class="px-4 py-3 text-[13px] text-gray-600">{{ formatDate(row.date) }}</td>
        <td class="px-4 py-3 text-[13px] text-gray-500">{{ row.externalOrderId }}</td>
        <td class="px-4 py-3 text-[13px] text-gray-500">{{ row.tableNumber }}</td>
        <td class="px-4 py-3 text-[13px] text-right font-semibold text-[#0A0A0A]">{{ formatRM(row.amount) }}</td>
        <td class="px-4 py-3">
          <select
            v-if="!dupSet.has(row.externalOrderId)"
            v-model="row.ambassadorId"
            class="w-full max-w-[180px] rounded-lg border px-2 py-1 text-[12px] bg-white"
            :class="row.ambassadorId ? 'border-[#E0E0E0]' : 'border-amber-300 bg-amber-50'"
          >
            <option value="">— Pick —</option>
            <option v-for="a in (ambassadors ?? [])" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>
          <span v-else class="text-[12px] text-gray-400 italic">—</span>
        </td>
        <td class="px-4 py-3">
          <AppBadge v-if="dupSet.has(row.externalOrderId)" tone="slate">duplicate</AppBadge>
          <AppBadge v-else-if="row.ambassadorId" tone="emerald">will import</AppBadge>
          <AppBadge v-else tone="amber">unassigned</AppBadge>
        </td>
      </template>
    </AppTable>
  </div>
</template>
