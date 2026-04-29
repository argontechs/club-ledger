<script setup lang="ts">
import { formatRM } from '~/utils/currency'
import { formatDate } from '~/utils/dateFormat'
import { useAuthStore } from '~/stores/auth'
import {
  ArrowUpTrayIcon, DocumentArrowDownIcon, CheckCircleIcon,
  DocumentTextIcon, XMarkIcon, ArrowPathIcon,
} from '@heroicons/vue/24/outline'
definePageMeta({ middleware: ['role'] })

const { data: ambassadors } = useAPI<any[]>('/ambassadors')

interface ParsedRow {
  date: string
  externalOrderId: string
  tableNumber: string
  amount: number
  ambassadorId: number | ''
}

const file = ref<File | null>(null)
const dryRun = ref<any | null>(null)
const rows = ref<ParsedRow[]>([])
const status = ref<'draft' | 'confirmed'>('draft')
const error = ref('')
const parsing = ref(false)
const importing = ref(false)
const result = ref<any | null>(null)
const isDragging = ref(false)

const stage = computed<'upload' | 'preview' | 'done'>(() => {
  if (result.value) return 'done'
  if (dryRun.value) return 'preview'
  return 'upload'
})

function onPickFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0] ?? null
  file.value = f
  error.value = ''
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  const f = e.dataTransfer?.files?.[0] ?? null
  if (f && f.type === 'application/pdf') file.value = f
  else error.value = 'Only PDF files are allowed'
}

async function parse() {
  error.value = ''
  if (!file.value) return
  parsing.value = true
  const fd = new FormData(); fd.set('file', file.value)
  try {
    const auth = useAuthStore()
    const r = await $fetch<any>('/api/v1/sales/import', {
      method: 'POST', body: fd,
      headers: { authorization: auth.token ? `Bearer ${auth.token}` : '' },
    })
    dryRun.value = r
    rows.value = (r.rows ?? []).map((x: any) => ({ ...x, ambassadorId: '' }))
  } catch (e: any) {
    error.value = e?.data?.error?.message || 'Parse failed'
  } finally {
    parsing.value = false
  }
}

const dupSet = computed(() => new Set<string>(dryRun.value?.duplicates ?? []))
const importableRows = computed(() => rows.value.filter(r => !dupSet.value.has(r.externalOrderId)))
const readyRows = computed(() => importableRows.value.filter(r => !!r.ambassadorId))
const unassignedCount = computed(() => importableRows.value.filter(r => !r.ambassadorId).length)
const allAssigned = computed(() => importableRows.value.length > 0 && unassignedCount.value === 0)

const totalsMismatch = computed(() =>
  dryRun.value && Math.abs(dryRun.value.parsedTotal - dryRun.value.headerTotal) > 0.05)

function reset() {
  file.value = null
  dryRun.value = null
  rows.value = []
  result.value = null
  error.value = ''
}

const m = useAPIMutation()
const toast = useToast()
async function commit() {
  if (!dryRun.value || importableRows.value.length === 0) return
  if (!allAssigned.value) {
    toast.error('Assign every row to an ambassador first')
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

function rowStatus(r: ParsedRow): { tone: 'slate' | 'emerald' | 'amber'; label: string } {
  if (dupSet.value.has(r.externalOrderId)) return { tone: 'slate', label: 'Duplicate' }
  if (!r.ambassadorId) return { tone: 'amber', label: 'Unassigned' }
  return { tone: 'emerald', label: 'Ready' }
}
</script>

<template>
  <!-- ===== STAGE 1 : UPLOAD ===== -->
  <div v-if="stage === 'upload'" class="space-y-5 max-w-3xl mx-auto">
    <div class="bg-white border border-[#E8E8EC] rounded-2xl p-6 shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-[14px] font-bold text-[#0A0A0A]">Upload sales PDF</h3>
        <p class="text-[11px] text-gray-400 hidden sm:block">PDF only · max 20MB</p>
      </div>

      <label
        v-if="!file"
        class="flex flex-col items-center justify-center gap-3 px-4 py-16 border-2 border-dashed rounded-xl cursor-pointer transition-colors"
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
          @click="file = null; error = ''"
        >
          <XMarkIcon class="w-4 h-4" />
        </button>
      </div>

      <p v-if="error" class="mt-3 text-[12px] text-red-600">{{ error }}</p>

      <div class="mt-5 flex flex-col sm:flex-row sm:justify-end gap-2">
        <AppButton class="w-full sm:w-auto" :disabled="!file || parsing" @click="parse">
          <DocumentArrowDownIcon class="w-4 h-4" />
          {{ parsing ? 'Parsing…' : 'Parse PDF' }}
        </AppButton>
      </div>
    </div>
  </div>

  <!-- ===== STAGE 2 : PREVIEW & ASSIGN ===== -->
  <div v-else-if="stage === 'preview'" class="space-y-5">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h2 class="text-[16px] font-bold text-[#0A0A0A]">Review parsed sales</h2>
        <p class="text-[12px] text-gray-500 mt-0.5">
          From <span class="font-medium text-gray-700">{{ file?.name }}</span>
          <span v-if="dryRun.ambassadorHint" class="ml-2">· PDF hint: <span class="font-medium text-gray-700">{{ dryRun.ambassadorHint }}</span></span>
        </p>
      </div>
      <AppButton variant="secondary" class="w-full sm:w-auto" @click="reset">
        <ArrowPathIcon class="w-4 h-4" />
        Start over
      </AppButton>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <AppCard label="PDF Total" prefix="RM " :value="formatRM(dryRun.headerTotal).replace(/^RM\s*/, '')" />
      <AppCard label="Parsed Total" prefix="RM " :value="formatRM(dryRun.parsedTotal).replace(/^RM\s*/, '')" />
      <AppCard label="Will Import" :value="readyRows.length" />
      <AppCard label="Duplicates" :value="dryRun.duplicates.length" />
    </div>

    <p v-if="totalsMismatch" class="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
      ⚠ Header and parsed totals don't match. Double-check the PDF before importing.
    </p>

    <!-- Per-row table -->
    <div class="bg-white border border-[#E8E8EC] rounded-2xl shadow-sm overflow-hidden">
      <div class="px-5 py-3 border-b border-[#F0F0F0] flex items-center justify-between">
        <h3 class="text-[12px] font-bold uppercase tracking-wide text-gray-400">Sales rows</h3>
        <p v-if="unassignedCount > 0" class="text-[12px] text-amber-700">
          {{ unassignedCount }} row(s) need an ambassador
        </p>
        <p v-else class="text-[12px] text-emerald-700">All assigned</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px]">
          <thead>
            <tr class="bg-[#FAFAFA] border-b border-[#F0F0F0]">
              <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Date</th>
              <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Order</th>
              <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Table</th>
              <th class="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-gray-300">Amount</th>
              <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300 w-[220px]">Ambassador</th>
              <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in rows" :key="i" class="border-b border-[#F8F8F8] last:border-b-0 hover:bg-[#FAFCFC]">
              <td class="px-4 py-3 text-[13px] text-gray-600">{{ formatDate(row.date) }}</td>
              <td class="px-4 py-3 text-[12px] text-gray-500 font-mono">{{ row.externalOrderId }}</td>
              <td class="px-4 py-3 text-[13px] text-gray-500">{{ row.tableNumber }}</td>
              <td class="px-4 py-3 text-[13px] text-right font-semibold text-[#0A0A0A]">{{ formatRM(row.amount) }}</td>
              <td class="px-4 py-3">
                <select
                  v-if="!dupSet.has(row.externalOrderId)"
                  v-model="row.ambassadorId"
                  class="w-full max-w-[200px] rounded-lg border px-2.5 py-1.5 text-[12px] bg-white outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-[#E11D48]/10"
                  :class="row.ambassadorId ? 'border-[#E0E0E0]' : 'border-amber-300 bg-amber-50'"
                >
                  <option value="">— Pick ambassador —</option>
                  <option v-for="a in (ambassadors ?? [])" :key="a.id" :value="a.id">{{ a.name }}</option>
                </select>
                <span v-else class="text-[12px] text-gray-400 italic">—</span>
              </td>
              <td class="px-4 py-3">
                <AppBadge :tone="rowStatus(row).tone">{{ rowStatus(row).label }}</AppBadge>
              </td>
            </tr>
            <tr v-if="rows.length === 0">
              <td colspan="6" class="px-4 py-12 text-center text-[13px] text-gray-400">No rows parsed.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer action bar -->
    <div class="bg-white border border-[#E8E8EC] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
      <div class="flex flex-col sm:flex-row sm:items-center gap-3">
        <span class="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Import as</span>
        <div class="flex items-center gap-1.5">
          <button
            v-for="opt in [{ value: 'draft', label: 'Draft' }, { value: 'confirmed', label: 'Confirmed' }]"
            :key="opt.value"
            type="button"
            class="px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors border"
            :class="status === opt.value
              ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
              : 'bg-white text-gray-600 border-[#E0E0E0] hover:border-gray-400'"
            @click="status = opt.value as any"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
      <AppButton class="w-full sm:w-auto" :disabled="!allAssigned || importing" @click="commit">
        {{ importing ? 'Importing…' : `Import ${readyRows.length} row(s)` }}
      </AppButton>
    </div>
  </div>

  <!-- ===== STAGE 3 : DONE ===== -->
  <div v-else class="space-y-5 max-w-3xl mx-auto">
    <div class="bg-white border border-[#E8E8EC] rounded-2xl p-6 shadow-sm flex items-start gap-4">
      <CheckCircleIcon class="w-8 h-8 text-emerald-600 shrink-0" />
      <div class="flex-1">
        <p class="text-[15px] font-semibold text-[#0A0A0A]">Import complete</p>
        <p class="text-[12px] text-gray-500 mt-0.5">
          Imported <span class="font-medium text-[#0A0A0A]">{{ result.imported }}</span> sale(s),
          skipped <span class="font-medium text-[#0A0A0A]">{{ result.skipped }}</span>.
        </p>
        <div class="mt-4 flex flex-col sm:flex-row gap-2">
          <AppButton variant="secondary" @click="reset">Import another file</AppButton>
          <NuxtLink to="/sales">
            <AppButton>View sales</AppButton>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
