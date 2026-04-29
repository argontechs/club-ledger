<script setup lang="ts">
import { CheckIcon, ArrowPathIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { formatRM } from '~/utils/currency'
import { currentMonth, formatDate } from '~/utils/dateFormat'
definePageMeta({ middleware: ['role'] })

const month = ref(currentMonth())
const statusFilter = ref<'all' | 'paid' | 'unpaid'>('all')
const { data: rows, refresh } = useAPI<any[]>(() => `/payouts?month=${month.value}`)
const { data: ambassadors } = useAPI<any[]>('/ambassadors')
const { data: teams } = useAPI<any[]>('/teams')

const showAdd = ref(false)
const ambassadorId = ref<number | null>(null)
const amount = ref<number>(0)
const notes = ref('')
const markPaidImmediately = ref(false)
const saving = ref(false)

const detailModalOpen = ref(false)
const selectedAmbassador = ref<any | null>(null)

const m = useAPIMutation()
const confirm = useConfirm()
const toast = useToast()

const filteredRows = computed(() => {
  const list = rows.value ?? []
  if (statusFilter.value === 'paid') return list.filter(r => !!r.paidAt)
  if (statusFilter.value === 'unpaid') return list.filter(r => !r.paidAt)
  return list
})

function openAddModal() {
  ambassadorId.value = null
  amount.value = 0
  notes.value = ''
  markPaidImmediately.value = false
  showAdd.value = true
}

async function add() {
  if (!ambassadorId.value) {
    toast.error('Please select an ambassador')
    return
  }
  saving.value = true
  try {
    await m.post('/payouts', {
      ambassadorId: ambassadorId.value,
      periodMonth: month.value,
      amount: Number(amount.value),
      notes: notes.value || null,
      markPaid: markPaidImmediately.value,
    })
    showAdd.value = false
    await refresh()
    toast.success('Payout recorded')
  } catch (e: any) {
    toast.error(e?.data?.error?.message || 'Failed to record payout')
  } finally {
    saving.value = false
  }
}

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

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
]
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
        <AppMonthPicker v-model="month" />
        <AppSelect v-model="statusFilter" :options="statusOptions" />
      </div>
      <AppButton class="w-full sm:w-auto" @click="openAddModal">+ Record payout</AppButton>
    </div>

    <AppTable :rows="filteredRows" empty-text="No payouts for this filter">
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

    <!-- Record payout modal -->
    <AppModal :open="showAdd" title="Record payout" @close="showAdd = false">
      <div class="space-y-3">
        <AppSelect
          v-model="ambassadorId"
          label="Ambassador"
          :options="[{ value: '', label: '— Select ambassador —' }, ...((ambassadors ?? []).map(a => ({ value: a.id, label: a.name })))]"
        />
        <AppInput v-model="amount" type="number" label="Amount (RM)" />
        <AppInput v-model="notes" label="Notes (optional)" />
        <label class="flex items-center gap-2 pt-1">
          <input
            v-model="markPaidImmediately"
            type="checkbox"
            class="w-4 h-4 rounded border-gray-300 text-[#E11D48] focus:ring-[#E11D48]/30"
          >
          <span class="text-[13px] text-gray-700">Mark as paid immediately</span>
        </label>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="showAdd = false">Cancel</AppButton>
        <AppButton :disabled="saving" @click="add">{{ saving ? 'Saving…' : 'Save payout' }}</AppButton>
      </template>
    </AppModal>

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
            <div class="flex justify-between gap-3">
              <dt class="text-[12px] text-gray-500">Account number</dt>
              <dd class="text-[13px] font-mono text-[#0A0A0A]">{{ selectedAmbassador.bankAccountNumber || '—' }}</dd>
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
