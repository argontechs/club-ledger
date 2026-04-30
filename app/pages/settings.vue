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
  <div class="space-y-6 max-w-5xl mx-auto">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Venue card -->
      <section class="bg-[var(--color-card)] border border-[var(--color-border-2)] rounded-2xl p-6 shadow-card space-y-4">
        <header>
          <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-2)]">Branding</p>
          <h3 class="font-display text-[17px] font-semibold text-[var(--color-ink)] tracking-tight mt-0.5">Venue</h3>
          <p class="text-[12px] text-[var(--color-muted)] mt-1">Display name and currency shown across the dashboard.</p>
        </header>
        <div class="space-y-3">
          <AppInput v-model="form.venue_name" label="Venue name" />
          <AppInput v-model="form.currency_symbol" label="Currency symbol" />
        </div>
      </section>

      <!-- Commission rates card -->
      <section class="bg-[var(--color-card)] border border-[var(--color-border-2)] rounded-2xl p-6 shadow-card space-y-4">
        <header>
          <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-2)]">Earnings</p>
          <h3 class="font-display text-[17px] font-semibold text-[var(--color-ink)] tracking-tight mt-0.5">Commission rates</h3>
          <p class="text-[12px] text-[var(--color-muted)] mt-1">
            Changes apply only to <span class="italic">future</span> sale confirmations. Already-confirmed sales keep their snapshotted rates.
          </p>
        </header>
        <div class="space-y-3">
          <AppInput v-model="form.default_commission_rate" type="number" label="Default ambassador rate (%)" />
          <AppInput v-model="form.bonus_rate" type="number" label="Owner / Admin bonus (%)" />
        </div>
      </section>

      <!-- Company info card (PDF reports) -->
      <section class="bg-[var(--color-card)] border border-[var(--color-border-2)] rounded-2xl p-6 shadow-card space-y-4 lg:col-span-2">
        <header>
          <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-2)]">Documents</p>
          <h3 class="font-display text-[17px] font-semibold text-[var(--color-ink)] tracking-tight mt-0.5">Company info</h3>
          <p class="text-[12px] text-[var(--color-muted)] mt-1">Used in payslip and payout summary PDF headers.</p>
        </header>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AppInput v-model="form.company_name" label="Company name" />
          <AppInput v-model="form.company_registration" label="Registration / SSM" />
          <AppInput v-model="form.company_phone" label="Phone" />
          <AppInput v-model="form.company_email" label="Email" type="email" />
          <div class="md:col-span-2">
            <label class="block">
              <span class="block text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-[0.14em] mb-1.5">
                Company address
              </span>
              <textarea
                v-model="form.company_address"
                rows="3"
                class="w-full px-3.5 py-2.5 border border-[var(--color-border)] rounded-lg text-[13px] bg-white text-[var(--color-ink)] placeholder:text-[var(--color-muted-2)] outline-none focus:border-[var(--color-brand)] focus:ring-4 focus:ring-[var(--color-brand)]/12 transition-[border-color,box-shadow] duration-150 resize-none"
              />
            </label>
          </div>
        </div>
      </section>
    </div>

    <div class="flex items-center justify-end gap-3">
      <Transition name="fade">
        <span v-if="saved" class="text-[12px] text-emerald-700 inline-flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Saved
        </span>
      </Transition>
      <AppButton :disabled="saving" @click="save">
        {{ saving ? 'Saving…' : 'Save settings' }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
