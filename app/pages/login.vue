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
  <div class="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-4">
    <form
      class="w-[380px] bg-white rounded-2xl border border-[#E8E8EC] shadow-sm p-6 space-y-4"
      @submit.prevent="submit"
    >
      <div class="flex flex-col items-center gap-3">
        <div class="w-20 h-20 rounded-2xl bg-[#0A0A0A] overflow-hidden flex items-center justify-center shrink-0">
          <img
            src="~/assets/img/nono-logo.png"
            alt="Nono Club"
            class="w-full h-full object-cover select-none pointer-events-none"
          />
        </div>
        <div class="text-center">
          <h1 class="text-[15px] font-bold text-[#0A0A0A] tracking-wide">Nono Club</h1>
          <p class="text-[11px] text-gray-400 mt-0.5">Sales &amp; commission tracking</p>
        </div>
      </div>

      <div class="space-y-3 pt-2">
        <AppInput v-model="email" type="email" label="Email" placeholder="you@nonoclub.local" />
        <AppInput v-model="password" type="password" label="Password" />
      </div>

      <p v-if="error" class="text-[12px] text-red-600 text-center">{{ error }}</p>

      <AppButton type="submit" :disabled="loading" class="w-full">
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </AppButton>
    </form>
  </div>
</template>
