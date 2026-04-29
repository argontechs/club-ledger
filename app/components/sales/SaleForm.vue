<script setup lang="ts">
const props = defineProps<{ ambassadors: Array<{ id: number; name: string }> }>()
const emit = defineEmits<{ (e: 'submit', payload: any): void }>()

const date = ref(new Date().toISOString().slice(0, 10))
const ambassadorId = ref<number | null>(null)
const type = ref<'Table' | 'BGO'>('Table')
const amount = ref<number>(0)
const notes = ref('')

function submit() {
  if (!ambassadorId.value) return
  emit('submit', {
    date: date.value, ambassadorId: ambassadorId.value, type: type.value,
    amount: Number(amount.value), notes: notes.value || null,
  })
}
</script>
<template>
  <form class="space-y-3" @submit.prevent="submit">
    <AppInput v-model="date" type="date" label="Date" />
    <AppSelect v-model="ambassadorId" label="Ambassador"
      :options="props.ambassadors.map(a => ({ value: a.id, label: a.name }))" />
    <AppSelect v-model="type" label="Type"
      :options="[{ value: 'Table', label: 'Table' }, { value: 'BGO', label: 'BGO' }]" />
    <AppInput v-model="amount" type="number" label="Amount (RM)" />
    <AppInput v-model="notes" label="Notes (optional)" />
    <AppButton type="submit">Save draft</AppButton>
  </form>
</template>
