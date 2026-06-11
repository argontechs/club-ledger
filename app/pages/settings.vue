<script setup lang="ts">
import { useClub } from '~/composables/useClub'
definePageMeta({ middleware: ['role'] })
const { data: settings, refresh } = useAPI<Record<string, string>>('/settings')
const { activeClub, activeClubId, refreshClubs } = useClub()
const { data: branding, refresh: refreshBranding } = useAPI<{ logoUrl: string | null; venueName: string }>(
  () => activeClubId.value ? `/branding?club=${activeClubId.value}` : '/branding',
)

const form = ref({
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
    ...form.value,
    currency_symbol: s.currency_symbol ?? '',
    company_name: s.company_name ?? '',
    company_address: s.company_address ?? '',
    company_registration: s.company_registration ?? '',
    company_phone: s.company_phone ?? '',
    company_email: s.company_email ?? '',
  }
}, { immediate: true })
// The venue name is the ACTIVE CLUB's name (clubs table), not a settings key.
watch(activeClub, (c) => { if (c) form.value.venue_name = c.name }, { immediate: true })

const m = useAPIMutation()
const toast = useToast()
async function save() {
  saving.value = true
  saved.value = false
  try {
    await m.put('/settings', {
      currency_symbol: form.value.currency_symbol,
      company_name: form.value.company_name,
      company_address: form.value.company_address,
      company_registration: form.value.company_registration,
      company_phone: form.value.company_phone,
      company_email: form.value.company_email,
    })
    if (activeClubId.value && form.value.venue_name.trim() && form.value.venue_name !== activeClub.value?.name) {
      await m.put(`/clubs/${activeClubId.value}`, { name: form.value.venue_name.trim() })
      await refreshClubs()
    }
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

const password = ref({ current: '', next: '', confirm: '' })
const passwordErrors = ref<{ current?: string; next?: string; confirm?: string }>({})
const changingPassword = ref(false)

async function changePassword() {
  passwordErrors.value = {}
  if (!password.value.current) passwordErrors.value.current = 'Required'
  if (!password.value.next || password.value.next.length < 6)
    passwordErrors.value.next = 'At least 6 characters'
  if (password.value.next !== password.value.confirm)
    passwordErrors.value.confirm = 'Passwords do not match'
  if (Object.keys(passwordErrors.value).length) return

  changingPassword.value = true
  try {
    await m.post('/auth/change-password', {
      currentPassword: password.value.current,
      newPassword: password.value.next,
    })
    password.value = { current: '', next: '', confirm: '' }
    toast.success('Password updated')
  } catch (e: any) {
    const details = e?.data?.error?.details as Record<string, string> | undefined
    if (details?.currentPassword) passwordErrors.value.current = details.currentPassword
    if (details?.newPassword) passwordErrors.value.next = details.newPassword
    if (!details) toast.error(e?.data?.error?.message || 'Failed to update password')
  } finally {
    changingPassword.value = false
  }
}
</script>

<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Venue card -->
      <section data-tour="settings-club" class="bg-[var(--color-card)] border border-[var(--color-border-2)] rounded-2xl p-6 shadow-card space-y-4">
        <header>
          <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-2)]">Branding</p>
          <h3 class="font-display text-[17px] font-semibold text-[var(--color-ink)] tracking-tight mt-0.5">Active club</h3>
          <p class="text-[12px] text-[var(--color-muted)] mt-1">Renames the club selected in the switcher. Currency applies company-wide.</p>
        </header>
        <div class="space-y-3">
          <AppInput v-model="form.venue_name" label="Club name" />
          <AppInput v-model="form.currency_symbol" label="Currency symbol" />
        </div>
      </section>

      <!-- Branding card -->
      <section class="bg-[var(--color-card)] border border-[var(--color-border-2)] rounded-2xl p-6 shadow-card space-y-4">
        <header>
          <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-2)]">Branding</p>
          <h3 class="font-display text-[17px] font-semibold text-[var(--color-ink)] tracking-tight mt-0.5">Club logo</h3>
          <p class="text-[12px] text-[var(--color-muted)] mt-1">
            This club's logo — shown in the sidebar, header, and favicon while it is active.
          </p>
        </header>
        <LogoUploader :logo-url="branding?.logoUrl ?? null" @changed="refreshBranding" />
      </section>

      <!-- Security card -->
      <section class="bg-[var(--color-card)] border border-[var(--color-border-2)] rounded-2xl p-6 shadow-card space-y-4 lg:col-span-2">
        <header class="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-2)]">Account</p>
            <h3 class="font-display text-[17px] font-semibold text-[var(--color-ink)] tracking-tight mt-0.5">Change password</h3>
            <p class="text-[12px] text-[var(--color-muted)] mt-1">Update the password for your own account.</p>
          </div>
        </header>
        <form class="grid grid-cols-1 md:grid-cols-3 gap-3" @submit.prevent="changePassword">
          <AppInput
            v-model="password.current"
            type="password"
            label="Current password"
            :error="passwordErrors.current"
          />
          <AppInput
            v-model="password.next"
            type="password"
            label="New password"
            :error="passwordErrors.next"
          />
          <AppInput
            v-model="password.confirm"
            type="password"
            label="Confirm new password"
            :error="passwordErrors.confirm"
          />
          <div class="md:col-span-3 flex items-center justify-end">
            <AppButton type="submit" :disabled="changingPassword">
              {{ changingPassword ? 'Updating…' : 'Update password' }}
            </AppButton>
          </div>
        </form>
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
