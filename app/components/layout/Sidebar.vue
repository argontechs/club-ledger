<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRightOnRectangleIcon } from '@heroicons/vue/24/outline'
import { mainSidebarNav, mgmtSidebarNav, sidebarIconMap, type NavItem } from '~/config/sidebarNav'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const filterByRole = (items: NavItem[]) =>
  items.filter(n => auth.user && n.roles.includes(auth.user.role))

const mainItems = computed(() => filterByRole(mainSidebarNav))
const mgmtItems = computed(() => filterByRole(mgmtSidebarNav))

const isActive = (to: string) => route.path === to

const initials = computed(() => {
  const n = auth.user?.name ?? 'U'
  return n.split(/\s+/).map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || n.slice(0, 2).toUpperCase()
})

function logout() {
  auth.clear()
  router.push('/login')
}
</script>

<template>
  <aside
    class="flex flex-col w-[232px] bg-[var(--color-card)]/85 backdrop-blur-xl border-r border-[var(--color-border-2)] h-screen sticky top-0 shrink-0"
  >
    <!-- Logo -->
    <div class="flex items-center gap-3 px-4 py-5">
      <div class="relative w-11 h-11 rounded-xl bg-[var(--color-ink)] overflow-hidden flex items-center justify-center shrink-0 shadow-card ring-1 ring-black/10">
        <img
          src="~/assets/img/nono-logo.png"
          alt="Nono Club"
          class="w-full h-full object-cover select-none pointer-events-none"
        >
        <span class="absolute -right-1 -bottom-1 w-3 h-3 rounded-full bg-[var(--color-brand)] ring-2 ring-[var(--color-card)]" />
      </div>
      <div class="leading-tight">
        <div class="font-display font-bold text-[15px] text-[var(--color-ink)] tracking-tight">Nono Club</div>
        <div class="text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted-2)]">Sales · Commission</div>
      </div>
    </div>

    <!-- Nav -->
    <nav class="flex-1 px-2.5 py-2 overflow-y-auto">
      <p class="px-2.5 mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-2)]">Workspace</p>
      <div class="space-y-0.5">
        <NuxtLink
          v-for="item in mainItems"
          :key="item.to"
          :to="item.to"
          class="group press relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px]"
          :class="isActive(item.to)
            ? 'bg-[var(--color-ink)] text-white font-semibold shadow-card'
            : 'text-[var(--color-muted)] hover:bg-[var(--color-hairline)] hover:text-[var(--color-ink)]'"
        >
          <span
            v-if="isActive(item.to)"
            aria-hidden="true"
            class="absolute -left-2.5 top-2 bottom-2 w-1 rounded-r-full bg-[var(--color-brand)]"
          />
          <component
            :is="sidebarIconMap[item.icon]"
            class="w-[15px] h-[15px] shrink-0"
            :class="isActive(item.to) ? 'text-white' : 'text-[var(--color-muted-2)] group-hover:text-[var(--color-ink)]'"
            aria-hidden="true"
          />
          {{ item.label }}
        </NuxtLink>
      </div>

      <template v-if="mgmtItems.length">
        <p class="px-2.5 mt-5 mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-2)]">Management</p>
        <div class="space-y-0.5">
          <NuxtLink
            v-for="item in mgmtItems"
            :key="item.to"
            :to="item.to"
            class="group press relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px]"
            :class="isActive(item.to)
              ? 'bg-[var(--color-ink)] text-white font-semibold shadow-card'
              : 'text-[var(--color-muted)] hover:bg-[var(--color-hairline)] hover:text-[var(--color-ink)]'"
          >
            <span
              v-if="isActive(item.to)"
              aria-hidden="true"
              class="absolute -left-2.5 top-2 bottom-2 w-1 rounded-r-full bg-[var(--color-brand)]"
            />
            <component
              :is="sidebarIconMap[item.icon]"
              class="w-[15px] h-[15px] shrink-0"
              :class="isActive(item.to) ? 'text-white' : 'text-[var(--color-muted-2)] group-hover:text-[var(--color-ink)]'"
              aria-hidden="true"
            />
            {{ item.label }}
          </NuxtLink>
        </div>
      </template>
    </nav>

    <!-- User panel -->
    <div class="px-2.5 py-3 border-t border-[var(--color-border-2)]">
      <div class="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-[var(--color-hairline)] border border-[var(--color-border-2)]">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-ember)] flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-rose">
          {{ initials }}
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[12px] font-semibold text-[var(--color-ink)] truncate">{{ auth.user?.name }}</div>
          <div class="text-[10px] text-[var(--color-muted-2)] capitalize tracking-wide">{{ auth.user?.role }}</div>
        </div>
      </div>
      <button
        type="button"
        class="press mt-2 w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-[12px] font-medium text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
        @click="logout"
      >
        <ArrowRightOnRectangleIcon class="w-4 h-4 shrink-0" aria-hidden="true" />
        Log out
      </button>
    </div>
  </aside>
</template>
