<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const props = defineProps<{
  ambassadors: Array<{ id: number; name: string }>
  edit?: boolean
}>()
const emit = defineEmits<{ (e: 'submit', payload: any): void }>()

const date = ref(new Date().toISOString().slice(0, 10))
const ambassadorId = ref<number | null>(null)
const type = ref<'Table' | 'BGO'>('Table')
const amount = ref<number | string>('')
const tableNumber = ref('')
const notes = ref('')
const formError = ref('')

// Prefill from latest-defaults in create mode
onMounted(async () => {
  if (props.edit) return
  try {
    const auth = useAuthStore()
    const r = await $fetch<{ date: string; ambassadorId: number | null }>(
      '/api/v1/sales/latest-defaults',
      { headers: { authorization: auth.token ? `Bearer ${auth.token}` : '' } },
    )
    if (r?.date) date.value = r.date
    if (r?.ambassadorId) ambassadorId.value = r.ambassadorId
  } catch {
    // best-effort prefill — silently ignore
  }
})

function submit() {
  formError.value = ''
  if (!ambassadorId.value) {
    formError.value = 'Pick an ambassador before saving.'
    return
  }
  const trimmedTable = tableNumber.value.trim()
  if (!trimmedTable) {
    formError.value = 'Table number is required.'
    return
  }
  const numericAmount = Number(amount.value)
  if (!Number.isFinite(numericAmount) || numericAmount < 0) {
    formError.value = 'Amount must be zero or a positive number.'
    return
  }
  emit('submit', {
    date: date.value,
    ambassadorId: Number(ambassadorId.value),
    type: type.value,
    amount: numericAmount,
    tableNumber: trimmedTable,
    notes: notes.value.trim() || null,
  })
}
</script>

<template>
  <form class="space-y-3" @submit.prevent="submit">
    <AppInput v-model="date" type="date" label="Date" />
    <AppSelect
      v-model="ambassadorId"
      label="Ambassador"
      :options="props.ambassadors.map(a => ({ value: a.id, label: a.name }))"
    />
    <AppSelect
      v-model="type"
      label="Type"
      :options="[{ value: 'Table', label: 'Table' }, { value: 'BGO', label: 'BGO' }]"
    />
    <AppInput v-model="tableNumber" label="Table number" placeholder="e.g. T12" />
    <AppInput v-model="amount" type="number" label="Amount (RM)" placeholder="0.00" />
    <AppInput v-model="notes" label="Notes (optional)" />
    <p v-if="formError" class="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{{ formError }}</p>
    <div class="pt-2 flex justify-end">
      <AppButton type="submit">Save draft</AppButton>
    </div>
  </form>
</template>
