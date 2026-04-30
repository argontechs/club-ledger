<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
definePageMeta({ layout: false })

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const auth = useAuthStore()
const router = useRouter()

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const r = await $fetch<{ token: string; user: any }>('/api/v1/auth/login', {
      method: 'POST', body: { email: email.value, password: password.value },
    })
    auth.setSession(r.token, r.user)
    router.push('/')
  } catch (e: any) {
    error.value = e?.data?.error?.message || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="grain min-h-dvh bg-[var(--color-surface)] flex items-center justify-center p-4">
    <form
      class="relative w-[400px] max-w-full bg-[var(--color-card)] rounded-2xl border border-[var(--color-border-2)] shadow-lift p-7 space-y-5"
      @submit.prevent="submit"
    >
      <div class="flex flex-col items-center gap-3">
        <div class="relative w-20 h-20 rounded-2xl bg-[var(--color-ink)] overflow-hidden flex items-center justify-center shrink-0 ring-1 ring-black/10 shadow-card">
          <img
            src="~/assets/img/nono-logo.png"
            alt="Nono Club"
            class="w-full h-full object-cover select-none pointer-events-none"
          >
          <span class="absolute -right-1.5 -bottom-1.5 w-4 h-4 rounded-full bg-[var(--color-brand)] ring-3 ring-[var(--color-card)] shadow-rose" />
        </div>
        <div class="text-center">
          <h1 class="font-display text-[22px] font-bold text-[var(--color-ink)] tracking-tight text-balance">Welcome back</h1>
          <p class="text-[12px] text-[var(--color-muted)] mt-1">Sign in to track sales and commissions.</p>
        </div>
      </div>

      <div class="space-y-3">
        <AppInput v-model="email" type="email" label="Email" placeholder="you@nonoclub.local" />
        <AppInput v-model="password" type="password" label="Password" placeholder="••••••••" />
      </div>

      <div
        v-if="error"
        class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 text-center"
      >{{ error }}</div>

      <AppButton type="submit" :disabled="loading" class="w-full">
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </AppButton>

      <p class="text-center text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted-2)] pt-1">
        Nono Club · Sales &amp; commission
      </p>
    </form>
  </div>
</template>
