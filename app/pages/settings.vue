<script setup lang="ts">
definePageMeta({ middleware: ['role'] })
const { data: settings, refresh } = useAPI<Record<string, string>>('/settings')

const form = ref({ default_commission_rate: '', bonus_rate: '', currency_symbol: '', venue_name: '' })
watch(settings, (s) => { if (s) form.value = {
  default_commission_rate: s.default_commission_rate, bonus_rate: s.bonus_rate,
  currency_symbol: s.currency_symbol, venue_name: s.venue_name,
} }, { immediate: true })

const m = useAPIMutation()
async function save() {
  await m.put('/settings', {
    default_commission_rate: Number(form.value.default_commission_rate),
    bonus_rate: Number(form.value.bonus_rate),
    currency_symbol: form.value.currency_symbol,
    venue_name: form.value.venue_name,
  })
  await refresh()
}
</script>
<template>
  <div class="space-y-4 max-w-md">
    <h1 class="text-xl font-semibold">Settings</h1>
    <AppCard class="space-y-3">
      <AppInput v-model="form.venue_name" label="Venue name" />
      <AppInput v-model="form.currency_symbol" label="Currency symbol (display)" />
      <AppInput v-model="form.default_commission_rate" type="number" label="Default ambassador commission rate (%)" />
      <AppInput v-model="form.bonus_rate" type="number" label="Owner / Admin bonus rate (%)" />
      <p class="text-xs text-slate-500">
        Changes apply only to <i>future</i> sale confirmations. Already-confirmed sales keep their snapshotted rates.
      </p>
      <AppButton @click="save">Save</AppButton>
    </AppCard>
  </div>
</template>
