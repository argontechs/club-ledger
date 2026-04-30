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

const summary = computed(() => {
  const list = rows.value ?? []
  const paid = list.filter(r => !!r.paidAt)
  const unpaid = list.filter(r => !r.paidAt)
  const paidAmt = paid.reduce((a, r) => a + Number(r.amount || 0), 0)
  const unpaidAmt = unpaid.reduce((a, r) => a + Number(r.amount || 0), 0)
  return [
    { label: 'Payouts this month', value: list.length, tone: 'ink' as const },
    { label: 'Paid out', prefix: 'RM', value: formatRM(paidAmt).replace(/^RM\s*/, '') },
    { label: 'Outstanding', prefix: 'RM', value: formatRM(unpaidAmt).replace(/^RM\s*/, ''), tone: unpaidAmt > 0 ? 'brand' as const : undefined },
    { label: 'Recipients', value: new Set(list.map(r => r.ambassadorId)).size },
  ]
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
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
] as const
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <AppMonthPills v-model="month" :months="monthList ?? []" label="Month" empty-text="No payouts recorded yet" />
      <AppButton class="w-full sm:w-auto" @click="showCreate = true">+ Create payouts</AppButton>
    </div>

    <AppStatStrip :stats="summary" />

    <AppPillGroup v-model="statusFilter" :options="statusOptions" label="Status" />

    <AppTable :rows="pagedRows" empty-text="No payouts for this filter. Use + Create payouts to settle the pool.">
      <template #head>
        <th class="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Ambassador</th>
        <th class="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Period</th>
        <th class="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Amount</th>
        <th class="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Status</th>
        <th class="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Paid at</th>
        <th class="px-4 py-3" />
      </template>
      <template #row="{ row }">
        <td class="px-4 py-3 text-[13px] font-medium text-[var(--color-ink)]">
          <button
            type="button"
            class="text-left transition-colors hover:text-[var(--color-brand)] hover:underline underline-offset-4"
            @click="openAmbassadorDetail(row.ambassadorId)"
          >
            {{ ambassadors?.find(a => a.id === row.ambassadorId)?.name ?? row.ambassadorId }}
          </button>
        </td>
        <td class="px-4 py-3 text-[13px] text-[var(--color-muted)] tabular">{{ row.periodMonth }}</td>
        <td class="px-4 py-3 text-[13px] text-right font-semibold text-[var(--color-ink)] tabular">{{ formatRM(row.amount) }}</td>
        <td class="px-4 py-3 text-[13px]">
          <AppBadge v-if="row.paidAt" tone="emerald">Paid</AppBadge>
          <AppBadge v-else tone="amber">Unpaid</AppBadge>
        </td>
        <td class="px-4 py-3 text-[13px] text-[var(--color-muted)] tabular">{{ row.paidAt ? formatDate(row.paidAt.slice(0, 10)) : '—' }}</td>
        <td class="px-4 py-3 text-right">
          <div class="inline-flex gap-0.5">
            <button
              v-if="!row.paidAt"
              type="button"
              title="Mark as paid"
              class="press w-8 h-8 inline-flex items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-50"
              @click="markPaid(row.id)"
            >
              <CheckIcon class="w-4 h-4" />
            </button>
            <button
              v-if="row.paidAt"
              type="button"
              title="Mark as unpaid"
              class="press w-8 h-8 inline-flex items-center justify-center rounded-lg text-amber-700 hover:bg-amber-50"
              @click="markUnpaid(row.id)"
            >
              <ArrowPathIcon class="w-4 h-4" />
            </button>
            <button
              type="button"
              :title="downloadingSummary === row.id ? 'Downloading…' : 'Download summary PDF'"
              :disabled="downloadingSummary === row.id"
              class="press w-8 h-8 inline-flex items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)] disabled:opacity-50"
              @click="downloadSummary(row.id)"
            >
              <DocumentArrowDownIcon class="w-4 h-4" />
            </button>
            <button
              type="button"
              :title="generatingPayslip === row.id ? 'Generating…' : 'Generate & download payslip'"
              :disabled="generatingPayslip === row.id"
              class="press w-8 h-8 inline-flex items-center justify-center rounded-lg text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
              @click="downloadPayslip(row.id)"
            >
              <DocumentTextIcon class="w-4 h-4" />
            </button>
            <button
              type="button"
              title="Receipts"
              class="press relative w-8 h-8 inline-flex items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
              @click="openReceipts(row)"
            >
              <PaperClipIcon class="w-4 h-4" />
              <span
                v-if="row.receiptPaths?.length"
                class="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[var(--color-brand)] text-white text-[9px] font-bold leading-none ring-2 ring-[var(--color-card)]"
              >
                {{ row.receiptPaths.length }}
              </span>
            </button>
            <button
              type="button"
              title="Delete payout"
              class="press w-8 h-8 inline-flex items-center justify-center rounded-lg text-[var(--color-muted-2)] hover:bg-rose-50 hover:text-rose-700"
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

    <PayoutCreateModal
      :open="showCreate"
      @close="showCreate = false"
      @created="refresh"
    />

    <PayoutReceiptModal
      :open="receiptOpen"
      :payout="receiptPayout"
      @close="closeReceipts"
      @updated="onReceiptsUpdated"
    />

    <AppModal
      :open="detailModalOpen"
      title="Ambassador details"
      @close="closeDetailModal"
    >
      <div v-if="selectedAmbassador" class="space-y-5">
        <section>
          <h4 class="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)] mb-3">Personal</h4>
          <dl class="rounded-xl border border-[var(--color-border-2)] bg-[var(--color-hairline)]/40 divide-y divide-[var(--color-hairline)]">
            <div class="flex justify-between gap-3 px-4 py-2.5">
              <dt class="text-[12px] text-[var(--color-muted)]">Name</dt>
              <dd class="text-[13px] font-medium text-[var(--color-ink)]">{{ selectedAmbassador.name }}</dd>
            </div>
            <div class="flex justify-between gap-3 px-4 py-2.5">
              <dt class="text-[12px] text-[var(--color-muted)]">Full legal name</dt>
              <dd class="text-[13px] text-[var(--color-ink)]">{{ selectedAmbassador.fullName || '—' }}</dd>
            </div>
            <div class="flex justify-between gap-3 px-4 py-2.5">
              <dt class="text-[12px] text-[var(--color-muted)]">Team</dt>
              <dd class="text-[13px] text-[var(--color-ink)]">{{ teamName(selectedAmbassador.teamId) }}</dd>
            </div>
          </dl>
        </section>
        <section>
          <h4 class="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)] mb-3">Bank details</h4>
          <dl class="rounded-xl border border-[var(--color-border-2)] bg-[var(--color-hairline)]/40 divide-y divide-[var(--color-hairline)]">
            <div class="flex justify-between gap-3 px-4 py-2.5">
              <dt class="text-[12px] text-[var(--color-muted)]">Bank name</dt>
              <dd class="text-[13px] text-[var(--color-ink)]">{{ selectedAmbassador.bankName || '—' }}</dd>
            </div>
            <div class="flex justify-between gap-3 items-center px-4 py-2.5">
              <dt class="text-[12px] text-[var(--color-muted)]">Account number</dt>
              <dd class="text-[13px] font-mono text-[var(--color-ink)] flex items-center gap-2 tabular">
                <span>{{ selectedAmbassador.bankAccountNumber || '—' }}</span>
                <button
                  v-if="selectedAmbassador.bankAccountNumber"
                  type="button"
                  class="press w-6 h-6 inline-flex items-center justify-center rounded-md text-[var(--color-muted-2)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
                  title="Copy account number"
                  @click="copyAccount(selectedAmbassador.bankAccountNumber)"
                >
                  <ClipboardDocumentIcon class="w-3.5 h-3.5" />
                </button>
              </dd>
            </div>
            <div class="flex justify-between gap-3 px-4 py-2.5">
              <dt class="text-[12px] text-[var(--color-muted)]">Account holder</dt>
              <dd class="text-[13px] text-[var(--color-ink)]">{{ selectedAmbassador.bankOwnerName || '—' }}</dd>
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
