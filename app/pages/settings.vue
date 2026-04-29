<script setup lang="ts">
definePageMeta({ middleware: ['role'] })
const { data: settings, refresh } = useAPI<Record<string, string>>('/settings')

const form = ref({ default_commission_rate: '', bonus_rate: '', currency_symbol: '', venue_name: '' })
const saving = ref(false)
const saved = ref(false)

watch(settings, (s) => {
  if (s) form.value = {
    default_commission_rate: s.default_commission_rate,
    bonus_rate: s.bonus_rate,
    currency_symbol: s.currency_symbol,
    venue_name: s.venue_name,
  }
}, { immediate: true })

const m = useAPIMutation()
async function save() {
  saving.value = true
  saved.value = false
  try {
    await m.put('/settings', {
      default_commission_rate: Number(form.value.default_commission_rate),
      bonus_rate: Number(form.value.bonus_rate),
      currency_symbol: form.value.currency_symbol,
      venue_name: form.value.venue_name,
    })
    await refresh()
    saved.value = true
    setTimeout(() => { saved.value = false }, 2200)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-5 max-w-2xl">
    <div class="bg-white border border-[#E8E8EC] rounded-2xl p-6 shadow-sm space-y-4">
      <div>
        <h3 class="text-[14px] font-bold text-[#0A0A0A]">Venue</h3>
        <p class="text-[12px] text-gray-500 mt-0.5">Display name and currency shown across the dashboard.</p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AppInput v-model="form.venue_name" label="Venue name" />
        <AppInput v-model="form.currency_symbol" label="Currency symbol" />
      </div>

      <div class="border-t border-[#F0F0F0] pt-4">
        <h3 class="text-[14px] font-bold text-[#0A0A0A]">Commission rates</h3>
        <p class="text-[12px] text-gray-500 mt-0.5">
          Changes apply only to <span class="italic">future</span> sale confirmations. Already-confirmed sales keep their snapshotted rates.
        </p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AppInput v-model="form.default_commission_rate" type="number" label="Default ambassador rate (%)" />
        <AppInput v-model="form.bonus_rate" type="number" label="Owner / Admin bonus (%)" />
      </div>

      <div class="flex items-center justify-end gap-3 pt-2">
        <span v-if="saved" class="text-[12px] text-emerald-700">Saved.</span>
        <AppButton :disabled="saving" @click="save">
          {{ saving ? 'Saving…' : 'Save settings' }}
        </AppButton>
      </div>
    </div>
  </div>
</template>
