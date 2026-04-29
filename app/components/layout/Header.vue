<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
const auth = useAuthStore()
const router = useRouter()
function logout() { auth.clear(); router.push('/login') }
</script>
<template>
  <header class="h-14 bg-white border-b flex items-center justify-between px-6">
    <div></div>
    <div class="flex items-center gap-3 text-sm">
      <span>{{ auth.user?.name }} ({{ auth.user?.role }})</span>
      <button class="rounded border px-3 py-1 hover:bg-slate-50" @click="logout">Logout</button>
    </div>
  </header>
</template>
