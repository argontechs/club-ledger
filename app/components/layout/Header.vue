<script setup lang="ts">
import { computed, inject } from 'vue'
import { useRoute } from 'vue-router'
import { Bars3Icon, QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'
import { useTour } from '~/composables/useTour'

const route = useRoute()
const drawer = useDrawer()
const branding = inject<any>('branding', null)
const tour = useTour()
const hasTour = computed(() => !!tour.hasChapterFor(route.path))

const titles: Record<string, { title: string; eyebrow?: string }> = {
  '/':             { title: 'Dashboard',    eyebrow: 'Overview' },
  '/sales':        { title: 'Sales',        eyebrow: 'Tracking' },
  '/sales/import': { title: 'Import sales', eyebrow: 'Tracking' },
  '/commissions':  { title: 'Commissions',  eyebrow: 'Earnings' },
  '/payouts':      { title: 'Payouts',      eyebrow: 'Earnings' },
  '/leaderboard':  { title: 'Leaderboard',  eyebrow: 'Performance' },
  '/ambassadors':  { title: 'Ambassadors',  eyebrow: 'People' },
  '/teams':        { title: 'Teams',        eyebrow: 'People' },
  '/access':       { title: 'Access & roles', eyebrow: 'Admin' },
  '/clubs':        { title: 'Clubs',        eyebrow: 'Workspace' },
  '/roles':        { title: 'Roles',        eyebrow: 'Admin' },
  '/settings':     { title: 'Settings',     eyebrow: 'Admin' },
}

const meta = computed(() => titles[route.path] ?? { title: branding?.venueName ?? 'Overview' })

function openDrawer() { drawer.value = true }
</script>

<template>
  <header
    class="bg-[var(--color-card)] border-b border-[var(--color-border-2)] px-4 lg:px-8 py-3 lg:py-4 flex items-center justify-between gap-3 sticky top-0 z-20"
  >
    <div class="flex items-center gap-2 lg:gap-3 min-w-0">
      <button
        type="button"
        class="press lg:hidden w-9 h-9 inline-flex items-center justify-center rounded-lg text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-2)] shrink-0"
        aria-label="Open menu"
        @click="openDrawer"
      >
        <Bars3Icon class="w-5 h-5" />
      </button>

      <div class="lg:hidden flex items-center gap-2 min-w-0">
        <div class="w-8 h-8 rounded-lg bg-[var(--color-ink)] overflow-hidden flex items-center justify-center shrink-0">
          <img
            v-if="branding?.logoUrl"
            :src="branding.logoUrl"
            alt="Logo"
            class="w-full h-full object-cover select-none pointer-events-none"
          />
        </div>
        <span class="font-display font-bold text-[13px] tracking-tight text-[var(--color-ink)] truncate">{{ branding?.venueName ?? 'Nono Club' }}</span>
      </div>

      <div class="hidden lg:block min-w-0 leading-tight">
        <div
          v-if="meta.eyebrow"
          class="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-2)]"
        >{{ meta.eyebrow }}</div>
        <h1 class="font-display text-[20px] font-bold text-[var(--color-ink)] tracking-tight truncate">
          {{ meta.title }}
        </h1>
      </div>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <slot name="actions" />
      <button
        v-if="hasTour"
        type="button"
        class="press w-8 h-8 inline-flex items-center justify-center rounded-lg text-[var(--color-muted-2)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
        aria-label="Replay the page tour"
        title="Replay the page tour"
        @click="tour.restart(route.path)"
      >
        <QuestionMarkCircleIcon class="w-[18px] h-[18px]" />
      </button>
    </div>
  </header>
</template>
