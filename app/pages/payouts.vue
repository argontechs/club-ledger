<script setup lang="ts">
import {
  CheckIcon,
  ArrowPathIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  PaperClipIcon,
  ClipboardDocumentIcon,
} from '@heroicons/vue/24/outline'
import { formatRM } from '~/utils/currency'
import { currentMonth, formatDate } from '~/utils/dateFormat'
import { downloadAuthed } from '~/utils/download'
definePageMeta({ middleware: ['role'] })

const month = ref('')
const statusFilter = ref<'all' | 'paid' | 'unpaid'>('all')
const { data: monthList } = useAPI<string[]>('/payouts/months')
const { data: rows, refresh } = useAPI<any[]>(() => month.value ? `/payouts?month=${month.value}` : '')
const { data: ambassadors } = useAPI<any[]>('/ambassadors')
const { data: teams } = useAPI<any[]>('/teams')

watch(monthList, (list) => {
  if (list && list.length && !month.value) month.value = list[0]
  else if ((!list || list.length === 0) && !month.value) month.value = currentMonth()
}, { immediate: true })

// Pagination
const page = ref(1)
const perPage = ref(25)
watch([month, statusFilter], () => { page.value = 1 })

const showCreate = ref(false)

const detailModalOpen = ref(false)
const selectedAmbassador = ref<any | null>(null)

const receiptOpen = ref(false)
const receiptPayout = ref<any | null>(null)

const generatingPayslip = ref<number | null>(null)
const downloadingSummary = ref<number | null>(null)

const m = useAPIMutation()
const confirm = useConfirm()
const toast = useToast()

const filteredRows = computed(() => {
  const list = rows.value ?? []
  if (statusFilter.value === 'paid') return list.filter(r => !!r.paidAt)
  if (statusFilter.value === 'unpaid') return list.filter(r => !r.paidAt)
  return list
})

const pagedRows = computed(() => {
  const start = (page.value - 1) * perPage.value
  return filteredRows.value.slice(start, start + perPage.value)
})

async function markPaid(id: number) {
  try {
    await m.post(`/payouts/${id}/mark-paid`, {})
    await refresh()
    toast.success('Marked as paid')
  } catch (e: any) {
    toast.error(e?.data?.error?.message || 'Failed to mark as paid')
  }
}

async function markUnpaid(id: number) {
  try {
    await m.post(`/payouts/${id}/mark-unpaid`, {})
    await refresh()
    toast.success('Marked as unpaid')
  } catch (e: any) {
    toast.error(e?.data?.error?.message || 'Failed to mark as unpaid')
  }
}

async function remove(id: number) {
  if (!await confirm('Delete this payout?', { tone: 'danger', confirmText: 'Delete' })) return
  try {
    await m.del(`/payouts/${id}`)
    await refresh()
    toast.success('Payout deleted')
  } catch (e: any) {
    toast.error(e?.data?.error?.message || 'Failed to delete payout')
  }
}

async function downloadSummary(id: number) {
  downloadingSummary.value = id
  try {
    await downloadAuthed(`/payouts/${id}/summary`, `payout-${id}-summary.pdf`)
  } catch (e: any) {
    toast.error(e?.message ?? 'Failed to download summary')
  } finally {
    downloadingSummary.value = null
  }
}

async function downloadPayslip(id: number) {
  generatingPayslip.value = id
  try {
    await m.post(`/payouts/${id}/payslip`, {})
    await downloadAuthed(`/payouts/${id}/payslip`, `payout-${id}-payslip.pdf`)
    await refresh()
    toast.success('Payslip generated')
  } catch (e: any) {
    toast.error(e?.data?.error?.message ?? 'Failed to generate payslip')
  } finally {
    generatingPayslip.value = null
  }
}

function openReceipts(row: any) {
  receiptPayout.value = row
  receiptOpen.value = true
}

function closeReceipts() {
  receiptOpen.value = false
  receiptPayout.value = null
}

function onReceiptsUpdated(receipts: any[]) {
  if (receiptPayout.value) {
    receiptPayout.value = { ...receiptPayout.value, receiptPaths: receipts }
  }
  refresh()
}

function openAmbassadorDetail(ambassadorIdParam: number) {
  const a = ambassadors.value?.find(x => x.id === ambassadorIdParam)
  if (!a) return
  selectedAmbassador.value = a
  detailModalOpen.value = true
}

function closeDetailModal() {
  detailModalOpen.value = false
  selectedAmbassador.value = null
}

function teamName(teamId: number | null | undefined) {
  if (!teamId) return '—'
  return teams.value?.find(t => t.id === teamId)?.name ?? '—'
}

async function copyAccount(value: string | null | undefined) {
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
    toast.success('Account number copied')
  } catch {
    toast.error('Copy failed')
  }
}

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
]
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col gap-3">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <AppMonthPills v-model="month" :months="monthList ?? []" label="Month" empty-text="No payouts recorded yet" />
        <AppButton class="w-full sm:w-auto" @click="showCreate = true">+ Create payouts</AppButton>
      </div>
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mr-2">Status</span>
        <button
          v-for="opt in statusOptions"
          :key="opt.value"
          type="button"
          class="px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors border"
          :class="statusFilter === opt.value
            ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]'
            : 'bg-white text-gray-600 border-[#E0E0E0] hover:border-gray-400'"
          @click="statusFilter = opt.value as any"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <AppTable :rows="pagedRows" empty-text="No payouts for this filter">
      <template #head>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Ambassador</th>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Period</th>
        <th class="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-gray-300">Amount</th>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Status</th>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Paid at</th>
        <th class="px-4 py-2.5" />
      </template>
      <template #row="{ row }">
        <td class="px-4 py-3 text-[13px] font-medium text-[#0A0A0A]">
          <button
            type="button"
            class="text-left hover:text-[#E11D48] hover:underline transition-colors"
            @click="openAmbassadorDetail(row.ambassadorId)"
          >
            {{ ambassadors?.find(a => a.id === row.ambassadorId)?.name ?? row.ambassadorId }}
          </button>
        </td>
        <td class="px-4 py-3 text-[13px] text-gray-500">{{ row.periodMonth }}</td>
        <td class="px-4 py-3 text-[13px] text-right font-semibold text-[#0A0A0A]">{{ formatRM(row.amount) }}</td>
        <td class="px-4 py-3 text-[13px]">
          <AppBadge v-if="row.paidAt" tone="emerald">Paid</AppBadge>
          <AppBadge v-else tone="amber">Unpaid</AppBadge>
        </td>
        <td class="px-4 py-3 text-[13px] text-gray-500">{{ row.paidAt ? formatDate(row.paidAt.slice(0, 10)) : '-' }}</td>
        <td class="px-4 py-3 text-right">
          <div class="inline-flex gap-1">
            <button
              v-if="!row.paidAt"
              type="button"
              title="Mark as paid"
              class="w-8 h-8 inline-flex items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
              @click="markPaid(row.id)"
            >
              <CheckIcon class="w-4 h-4" />
            </button>
            <button
              v-if="row.paidAt"
              type="button"
              title="Mark as unpaid"
              class="w-8 h-8 inline-flex items-center justify-center rounded-md text-amber-600 hover:bg-amber-50 transition-colors"
              @click="markUnpaid(row.id)"
            >
              <ArrowPathIcon class="w-4 h-4" />
            </button>
            <button
              type="button"
              :title="downloadingSummary === row.id ? 'Downloading…' : 'Download summary PDF'"
              :disabled="downloadingSummary === row.id"
              class="w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
              @click="downloadSummary(row.id)"
            >
              <DocumentArrowDownIcon class="w-4 h-4" />
            </button>
            <button
              type="button"
              :title="generatingPayslip === row.id ? 'Generating…' : 'Generate & download payslip'"
              :disabled="generatingPayslip === row.id"
              class="w-8 h-8 inline-flex items-center justify-center rounded-md text-indigo-500 hover:bg-indigo-50 transition-colors disabled:opacity-50"
              @click="downloadPayslip(row.id)"
            >
              <DocumentTextIcon class="w-4 h-4" />
            </button>
            <button
              type="button"
              title="Receipts"
              class="relative w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
              @click="openReceipts(row)"
            >
              <PaperClipIcon class="w-4 h-4" />
              <span
                v-if="row.receiptPaths?.length"
                class="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#E11D48] text-white text-[9px] font-bold leading-none"
              >
                {{ row.receiptPaths.length }}
              </span>
            </button>
            <button
              type="button"
              title="Delete payout"
              class="w-8 h-8 inline-flex items-center justify-center rounded-md text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              @click="remove(row.id)"
            >
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </td>
      </template>
    </AppTable>

    <AppPagination
      v-if="filteredRows.length > 0"
      :total="filteredRows.length"
      :page="page"
      :per-page="perPage"
      @update:page="page = $event"
      @update:per-page="perPage = $event"
    />

    <!-- Batch create payouts modal -->
    <PayoutCreateModal
      :open="showCreate"
      @close="showCreate = false"
      @created="refresh"
    />

    <!-- Receipts modal -->
    <PayoutReceiptModal
      :open="receiptOpen"
      :payout="receiptPayout"
      @close="closeReceipts"
      @updated="onReceiptsUpdated"
    />

    <!-- Ambassador detail modal -->
    <AppModal
      :open="detailModalOpen"
      title="Ambassador details"
      @close="closeDetailModal"
    >
      <div v-if="selectedAmbassador" class="space-y-4">
        <section>
          <h4 class="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Personal</h4>
          <dl class="space-y-1.5">
            <div class="flex justify-between gap-3">
              <dt class="text-[12px] text-gray-500">Name</dt>
              <dd class="text-[13px] font-medium text-[#0A0A0A]">{{ selectedAmbassador.name }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-[12px] text-gray-500">Full legal name</dt>
              <dd class="text-[13px] text-[#0A0A0A]">{{ selectedAmbassador.fullName || '—' }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-[12px] text-gray-500">Team</dt>
              <dd class="text-[13px] text-[#0A0A0A]">{{ teamName(selectedAmbassador.teamId) }}</dd>
            </div>
          </dl>
        </section>
        <section>
          <h4 class="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Bank details</h4>
          <dl class="space-y-1.5">
            <div class="flex justify-between gap-3">
              <dt class="text-[12px] text-gray-500">Bank name</dt>
              <dd class="text-[13px] text-[#0A0A0A]">{{ selectedAmbassador.bankName || '—' }}</dd>
            </div>
            <div class="flex justify-between gap-3 items-center">
              <dt class="text-[12px] text-gray-500">Account number</dt>
              <dd class="text-[13px] font-mono text-[#0A0A0A] flex items-center gap-2">
                <span>{{ selectedAmbassador.bankAccountNumber || '—' }}</span>
                <button
                  v-if="selectedAmbassador.bankAccountNumber"
                  type="button"
                  class="w-6 h-6 inline-flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  title="Copy account number"
                  @click="copyAccount(selectedAmbassador.bankAccountNumber)"
                >
                  <ClipboardDocumentIcon class="w-3.5 h-3.5" />
                </button>
              </dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-[12px] text-gray-500">Account holder</dt>
              <dd class="text-[13px] text-[#0A0A0A]">{{ selectedAmbassador.bankOwnerName || '—' }}</dd>
            </div>
          </dl>
        </section>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="closeDetailModal">Close</AppButton>
      </template>
    </AppModal>
  </div>
</template>
