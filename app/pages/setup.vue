<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
definePageMeta({ layout: false })

const router = useRouter()
const step = ref(0)
const error = ref('')
const submitting = ref(false)

const owner = ref({ name: '', email: '', password: '', confirm: '' })
const company = ref({ name: '', currencySymbol: 'RM' })
const club = ref({ name: '' })

onMounted(async () => {
  // Only reachable on a fresh install.
  try {
    const s = await $fetch<{ needsSetup: boolean }>('/api/v1/setup/status')
    if (!s.needsSetup) router.replace('/login')
  } catch {}
})

const steps = ['Your account', 'Your company', 'First club']

const canNext = computed(() => {
  if (step.value === 0) {
    return owner.value.name.trim() && /.+@.+\..+/.test(owner.value.email)
      && owner.value.password.length >= 8 && owner.value.password === owner.value.confirm
  }
  if (step.value === 1) return company.value.currencySymbol.trim().length > 0
  return club.value.name.trim().length > 0
})

function next() {
  error.value = ''
  if (step.value < 2) { step.value++; return }
  finish()
}

async function finish() {
  submitting.value = true
  error.value = ''
  try {
    await $fetch('/api/v1/setup', {
      method: 'POST',
      body: {
        owner: { name: owner.value.name.trim(), email: owner.value.email.trim(), password: owner.value.password },
        company: { name: company.value.name.trim() || undefined, currencySymbol: company.value.currencySymbol.trim() },
        club: { name: club.value.name.trim() },
      },
    })
    router.push('/login')
  } catch (e: any) {
    error.value = e?.data?.error?.message || 'Setup failed — please try again.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="grain min-h-dvh bg-[var(--color-surface)] flex items-center justify-center p-4">
    <div class="relative w-[440px] max-w-full bg-[var(--color-card)] rounded-2xl border border-[var(--color-border-2)] shadow-lift p-7 space-y-5">
      <header class="space-y-1">
        <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-2)]">First-run setup · {{ step + 1 }} / 3</p>
        <h1 class="font-display text-[22px] font-bold text-[var(--color-ink)] tracking-tight">{{ steps[step] }}</h1>
      </header>

      <div class="flex gap-1.5" aria-hidden="true">
        <span
          v-for="(s, i) in steps" :key="s"
          class="h-1 flex-1 rounded-full"
          :class="i <= step ? 'bg-[var(--color-brand)]' : 'bg-[var(--color-hairline)]'"
        />
      </div>

      <div v-if="step === 0" class="space-y-3">
        <p class="text-[12.5px] text-[var(--color-muted)]">This becomes the owner login — full control over roles, clubs, and access.</p>
        <AppInput v-model="owner.name" label="Your name" />
        <AppInput v-model="owner.email" type="email" label="Email" />
        <AppInput v-model="owner.password" type="password" label="Password (min 8 characters)" />
        <AppInput v-model="owner.confirm" type="password" label="Confirm password" />
        <p v-if="owner.confirm && owner.password !== owner.confirm" class="text-[12px] text-rose-700">Passwords do not match.</p>
      </div>

      <div v-else-if="step === 1" class="space-y-3">
        <p class="text-[12.5px] text-[var(--color-muted)]">Used on payslips and payout statements. You can refine this later in Settings.</p>
        <AppInput v-model="company.name" label="Company name (optional)" />
        <AppInput v-model="company.currencySymbol" label="Currency symbol" placeholder="RM" />
      </div>

      <div v-else class="space-y-3">
        <p class="text-[12.5px] text-[var(--color-muted)]">
          Each club keeps its own ambassadors, commission roles, and sales. You can add more clubs any time from the sidebar switcher.
        </p>
        <AppInput v-model="club.name" label="Club name" placeholder="e.g. Nono Club" />
      </div>

      <p v-if="error" class="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{{ error }}</p>

      <div class="flex items-center justify-between pt-1">
        <AppButton v-if="step > 0" variant="ghost" @click="step--">Back</AppButton>
        <span v-else />
        <AppButton :disabled="!canNext || submitting" @click="next">
          {{ step < 2 ? 'Continue' : (submitting ? 'Setting up…' : 'Finish setup') }}
        </AppButton>
      </div>
    </div>
  </div>
</template>
