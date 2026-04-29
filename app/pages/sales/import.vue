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
const ambassadorId = ref<number | null>(null)
const status = ref<'draft' | 'confirmed'>('draft')
const error = ref('')
const importing = ref(false)
const result = ref<any | null>(null)
const isDragging = ref(false)

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
const toast = useToast()
async function commit() {
  if (!ambassadorId.value || !dryRun.value) return
  importing.value = true
  try {
    result.value = await m.post('/sales/import-commit', {
      ambassadorId: ambassadorId.value, status: status.value, rows: importableRows.value,
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
  <div class="space-y-5 max-w-4xl">
    <!-- Step 1: drop -->
    <div class="bg-white border border-[#E8E8EC] rounded-2xl p-5 shadow-sm">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-[12px] font-bold uppercase tracking-wide text-gray-400">Step 1 · Upload PDF</h3>
        <p class="text-[11px] text-gray-400 hidden sm:block">PDF only · max 20MB</p>
      </div>

      <!-- Empty state: dropzone -->
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

      <!-- Selected file state -->
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
          @click="file = null; dryRun = null; result = null; error = ''"
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

    <!-- Step 2: parse summary -->
    <div v-if="dryRun" class="bg-white border border-[#E8E8EC] rounded-2xl p-5 shadow-sm">
      <h3 class="text-[12px] font-bold uppercase tracking-wide text-gray-400 mb-3">Step 2 · Review &amp; assign</h3>
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

      <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <AppSelect
          v-model="ambassadorId"
          label="Assign to ambassador"
          :options="(ambassadors ?? []).map(a => ({ value: a.id, label: a.name }))"
        />
        <AppSelect
          v-model="status"
          label="Import as"
          :options="[{ value: 'draft', label: 'Draft' }, { value: 'confirmed', label: 'Confirmed' }]"
        />
      </div>

      <div class="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-2">
        <AppButton class="w-full sm:w-auto" :disabled="!ambassadorId || importing" @click="commit">
          Import {{ importableRows.length }} row(s)
        </AppButton>
      </div>
    </div>

    <!-- Step 3: result -->
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

    <!-- Rows table -->
    <AppTable v-if="dryRun" :rows="dryRun.rows" empty-text="No rows">
      <template #head>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Date</th>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Order</th>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Table</th>
        <th class="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-gray-300">Amount</th>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Status</th>
      </template>
      <template #row="{ row }">
        <td class="px-4 py-3 text-[13px] text-gray-600">{{ formatDate(row.date) }}</td>
        <td class="px-4 py-3 text-[13px] text-gray-500">{{ row.externalOrderId }}</td>
        <td class="px-4 py-3 text-[13px] text-gray-500">{{ row.tableNumber }}</td>
        <td class="px-4 py-3 text-[13px] text-right font-semibold text-[#0A0A0A]">{{ formatRM(row.amount) }}</td>
        <td class="px-4 py-3">
          <AppBadge v-if="dupSet.has(row.externalOrderId)" tone="slate">duplicate</AppBadge>
          <AppBadge v-else tone="emerald">will import</AppBadge>
        </td>
      </template>
    </AppTable>
  </div>
</template>
