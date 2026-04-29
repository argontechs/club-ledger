<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const titles: Record<string, string> = {
  '/':             'Dashboard',
  '/sales':        'Sales',
  '/sales/import': 'Import sales',
  '/commissions':  'Commissions',
  '/payouts':      'Payouts',
  '/leaderboard':  'Leaderboard',
  '/ambassadors':  'Ambassadors',
  '/teams':        'Teams',
  '/access':       'Access & roles',
  '/settings':     'Settings',
}

const title = computed(() => titles[route.path] ?? 'Nono Club')
</script>

<template>
  <header class="bg-white border-b border-[#E8E8EC] px-5 py-3 flex items-center justify-between sticky top-0 z-10">
    <div class="flex items-center gap-3">
      <h1 class="text-[16px] font-bold text-[#0A0A0A]">{{ title }}</h1>
    </div>
    <div class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
