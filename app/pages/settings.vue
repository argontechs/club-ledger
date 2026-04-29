<script setup lang="ts">
definePageMeta({ middleware: ['role'] })
const { data: settings, refresh } = useAPI<Record<string, string>>('/settings')

const form = ref({
  default_commission_rate: '',
  bonus_rate: '',
  currency_symbol: '',
  venue_name: '',
  company_name: '',
  company_address: '',
  company_registration: '',
  company_phone: '',
  company_email: '',
})
const saving = ref(false)
const saved = ref(false)

watch(settings, (s) => {
  if (s) form.value = {
    default_commission_rate: s.default_commission_rate ?? '',
    bonus_rate: s.bonus_rate ?? '',
    currency_symbol: s.currency_symbol ?? '',
    venue_name: s.venue_name ?? '',
    company_name: s.company_name ?? '',
    company_address: s.company_address ?? '',
    company_registration: s.company_registration ?? '',
    company_phone: s.company_phone ?? '',
    company_email: s.company_email ?? '',
  }
}, { immediate: true })

const m = useAPIMutation()
const toast = useToast()
async function save() {
  saving.value = true
  saved.value = false
  try {
    await m.put('/settings', {
      default_commission_rate: Number(form.value.default_commission_rate),
      bonus_rate: Number(form.value.bonus_rate),
      currency_symbol: form.value.currency_symbol,
      venue_name: form.value.venue_name,
      company_name: form.value.company_name,
      company_address: form.value.company_address,
      company_registration: form.value.company_registration,
      company_phone: form.value.company_phone,
      company_email: form.value.company_email,
    })
    await refresh()
    saved.value = true
    toast.success('Settings saved')
    setTimeout(() => { saved.value = false }, 2200)
  } catch (e: any) {
    toast.error(e?.data?.error?.message || 'Failed to save settings')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-5 max-w-5xl mx-auto">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Venue card -->
      <div class="bg-white border border-[#E8E8EC] rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h3 class="text-[14px] font-bold text-[#0A0A0A]">Venue</h3>
          <p class="text-[12px] text-gray-500 mt-0.5">Display name and currency shown across the dashboard.</p>
        </div>
        <div class="space-y-3">
          <AppInput v-model="form.venue_name" label="Venue name" />
          <AppInput v-model="form.currency_symbol" label="Currency symbol" />
        </div>
      </div>

      <!-- Commission rates card -->
      <div class="bg-white border border-[#E8E8EC] rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <h3 class="text-[14px] font-bold text-[#0A0A0A]">Commission rates</h3>
          <p class="text-[12px] text-gray-500 mt-0.5">
            Changes apply only to <span class="italic">future</span> sale confirmations. Already-confirmed sales keep their snapshotted rates.
          </p>
        </div>
        <div class="space-y-3">
          <AppInput v-model="form.default_commission_rate" type="number" label="Default ambassador rate (%)" />
          <AppInput v-model="form.bonus_rate" type="number" label="Owner / Admin bonus (%)" />
        </div>
      </div>

      <!-- Company info card (PDF reports) -->
      <div class="bg-white border border-[#E8E8EC] rounded-2xl p-6 shadow-sm space-y-4 lg:col-span-2">
        <div>
          <h3 class="text-[14px] font-bold text-[#0A0A0A]">Company info (PDF reports)</h3>
          <p class="text-[12px] text-gray-500 mt-0.5">Used in payslip and payout summary PDF headers.</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AppInput v-model="form.company_name" label="Company name" />
          <AppInput v-model="form.company_registration" label="Registration / SSM" />
          <AppInput v-model="form.company_phone" label="Phone" />
          <AppInput v-model="form.company_email" label="Email" type="email" />
          <div class="md:col-span-2">
            <label class="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Company address
            </label>
            <textarea
              v-model="form.company_address"
              rows="3"
              class="w-full px-3 py-2 border border-[#E0E0E0] rounded-lg text-[13px] bg-white text-[#0A0A0A] outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-[#E11D48]/10 transition-colors resize-none"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-end gap-3">
      <span v-if="saved" class="text-[12px] text-emerald-700">Saved.</span>
      <AppButton :disabled="saving" @click="save">
        {{ saving ? 'Saving…' : 'Save settings' }}
      </AppButton>
    </div>
  </div>
</template>
