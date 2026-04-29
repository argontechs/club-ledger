<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Bars3Icon } from '@heroicons/vue/24/outline'

const route = useRoute()
const drawer = useDrawer()

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

function openDrawer() { drawer.value = true }
</script>

<template>
  <header class="bg-white border-b border-[#E8E8EC] px-4 lg:px-5 py-3 flex items-center justify-between gap-3 sticky top-0 z-10">
    <div class="flex items-center gap-2 lg:gap-3 min-w-0">
      <!-- Hamburger (mobile only) -->
      <button
        type="button"
        class="lg:hidden w-9 h-9 inline-flex items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
        aria-label="Open menu"
        @click="openDrawer"
      >
        <Bars3Icon class="w-5 h-5" />
      </button>

      <!-- Mobile brand (hidden on desktop, sidebar shows it) -->
      <div class="lg:hidden flex items-center gap-2 min-w-0">
        <div class="w-8 h-8 rounded-lg bg-[#0A0A0A] overflow-hidden flex items-center justify-center shrink-0">
          <img
            src="~/assets/img/nono-logo.png"
            alt="Nono Club"
            class="w-full h-full object-cover select-none pointer-events-none"
          >
        </div>
        <span class="font-bold text-[12px] tracking-wide text-[#0A0A0A] truncate">NONO CLUB</span>
      </div>

      <!-- Page title (desktop primary, hidden on mobile to avoid crowding) -->
      <h1 class="hidden lg:block text-[16px] font-bold text-[#0A0A0A] truncate">{{ title }}</h1>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <slot name="actions" />
    </div>
  </header>
</template>
