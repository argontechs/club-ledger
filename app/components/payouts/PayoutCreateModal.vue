<script setup lang="ts">
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'created'): void }>()

const month = ref('')
const selected = ref<Set<number>>(new Set())
const markPaid = ref(false)
const saving = ref(false)
const m = useAPIMutation()
const toast = useToast()

const { data: candidates } = useAPI<any[]>(() => month.value ? `/commissions/ambassadors-for-month?month=${month.value}` : '/commissions/ambassadors-for-month?month=____')

watch(() => props.open, (v) => {
  if (v) {
    const today = new Date()
    month.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    selected.value = new Set()
    markPaid.value = false
  }
})
watch(month, () => { selected.value = new Set() })

const eligible = computed(() => (candidates.value ?? []).filter(c => !c.alreadyPaid))
const allSelected = computed(() => eligible.value.length > 0 && eligible.value.every(c => selected.value.has(c.id)))

function toggleAll() {
  if (allSelected.value) selected.value = new Set()
  else selected.value = new Set(eligible.value.map(c => c.id))
}
function toggle(id: number) {
  if (selected.value.has(id)) selected.value.delete(id)
  else selected.value.add(id)
  selected.value = new Set(selected.value)
}

async function save() {
  if (selected.value.size === 0) return
  saving.value = true
  try {
    const items = Array.from(selected.value).map(id => ({ ambassadorId: id, periodMonth: month.value }))
    const r = await m.post<{ created: number }>('/payouts/batch', { items, markPaid: markPaid.value })
    toast.success(`Created ${r.created} payout(s)`)
    emit('created')
    emit('close')
  } catch (e: any) {
    toast.error(e?.data?.error?.message ?? 'Failed to create payouts')
  } finally { saving.value = false }
}

function fmtRM(n: number) {
  return 'RM ' + n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>
<template>
  <AppModal :open="open" size="lg" title="Create payouts" @close="emit('close')">
    <div class="space-y-5">
      <div>
        <label class="block text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-[0.14em] mb-1.5">Month</label>
        <AppMonthPicker v-model="month" />
      </div>

      <div v-if="month">
        <div class="flex items-center justify-between mb-2">
          <p class="text-[12px] text-[var(--color-muted)] tabular">
            {{ eligible.length }} ambassador{{ eligible.length === 1 ? '' : 's' }} eligible. Already-paid hidden.
          </p>
          <button
            v-if="eligible.length"
            class="press text-[12px] text-[var(--color-brand-dark)] hover:text-[var(--color-brand)] font-semibold"
            @click="toggleAll"
          >
            {{ allSelected ? 'Clear all' : 'Select all' }}
          </button>
        </div>
        <div class="border border-[var(--color-border-2)] rounded-xl divide-y divide-[var(--color-hairline)] max-h-[280px] overflow-y-auto bg-[var(--color-card)]">
          <p v-if="!eligible.length" class="text-[12px] text-[var(--color-muted-2)] italic p-4 text-center">
            No eligible ambassadors for this month.
          </p>
          <label
            v-for="c in eligible"
            :key="c.id"
            class="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[var(--color-hairline)]/60 transition-colors"
          >
            <input
              type="checkbox"
              :checked="selected.has(c.id)"
              class="w-4 h-4 rounded accent-[var(--color-brand)] cursor-pointer"
              @change="toggle(c.id)"
            >
            <div class="min-w-0 flex-1">
              <p class="text-[13px] font-medium text-[var(--color-ink)]">{{ c.name }}</p>
              <p v-if="c.fullName" class="text-[11px] text-[var(--color-muted-2)]">{{ c.fullName }}</p>
            </div>
            <span class="text-[12px] text-[var(--color-muted)] tabular">{{ fmtRM(c.salesTotal) }}</span>
          </label>
        </div>
      </div>

      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input v-model="markPaid" type="checkbox" class="w-4 h-4 rounded accent-[var(--color-brand)] cursor-pointer" >
        <span class="text-[13px] text-[var(--color-ink-soft)]">Mark as paid immediately</span>
      </label>
    </div>
    <template #footer>
      <AppButton variant="secondary" @click="emit('close')">Cancel</AppButton>
      <AppButton :disabled="selected.size === 0 || saving" @click="save">
        {{ saving ? 'Creating…' : `Create ${selected.size || ''}` }}
      </AppButton>
    </template>
  </AppModal>
</template>
