<script setup lang="ts">
import { sidebarNav } from '~/config/sidebarNav'
import { useAuthStore } from '~/stores/auth'
const auth = useAuthStore()
const items = computed(() => sidebarNav.filter(n => auth.user && n.roles.includes(auth.user.role)))
</script>
<template>
  <aside class="w-56 bg-slate-900 text-slate-100 h-screen p-4 flex flex-col gap-1">
    <div class="text-lg font-semibold mb-4">Nono Club</div>
    <NuxtLink v-for="i in items" :key="i.to" :to="i.to"
      class="rounded px-3 py-2 hover:bg-slate-800"
      active-class="bg-slate-800">
      {{ i.label }}
    </NuxtLink>
  </aside>
</template>
