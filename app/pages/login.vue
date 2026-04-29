<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
definePageMeta({ layout: false })

const email = ref('')
const password = ref('')
const error = ref('')
const auth = useAuthStore()
const router = useRouter()

async function submit() {
  error.value = ''
  try {
    const r = await $fetch<{ token: string; user: any }>('/api/v1/auth/login', {
      method: 'POST', body: { email: email.value, password: password.value },
    })
    auth.setSession(r.token, r.user)
    router.push('/')
  } catch (e: any) {
    error.value = e?.data?.error?.message || 'Login failed'
  }
}
</script>
<template>
  <div class="min-h-screen bg-slate-100 flex items-center justify-center">
    <form class="w-80 bg-white border rounded p-6 space-y-4 shadow" @submit.prevent="submit">
      <h1 class="text-xl font-semibold">Nono Club</h1>
      <AppInput v-model="email" type="email" label="Email" placeholder="you@nonoclub.local" />
      <AppInput v-model="password" type="password" label="Password" />
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <AppButton type="submit" class="w-full">Sign in</AppButton>
    </form>
  </div>
</template>
