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
  <aside class="flex flex-col w-[220px] bg-white border-r border-[#E8E8EC] h-screen sticky top-0 shrink-0">
    <!-- Logo -->
    <div class="flex items-center gap-2.5 px-4 py-4 border-b border-[#F0F0F0]">
      <div class="w-11 h-11 rounded-xl bg-[#E11D48] flex items-center justify-center shrink-0 text-white font-bold text-[18px]">
        N
      </div>
      <span class="font-bold text-[13px] tracking-wide text-[#0A0A0A]">NONO CLUB</span>
    </div>

    <!-- Nav -->
    <nav class="flex-1 px-2 py-3 overflow-y-auto">
      <div class="space-y-0.5">
        <NuxtLink
          v-for="item in mainItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors"
          :class="isActive(item.to)
            ? 'bg-[#E11D4812] text-[#BE123C] font-semibold'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'"
        >
          <component
            :is="sidebarIconMap[item.icon]"
            class="w-[14px] h-[14px] shrink-0"
            :class="isActive(item.to) ? 'text-[#E11D48]' : 'text-gray-400'"
            aria-hidden="true"
          />
          {{ item.label }}
        </NuxtLink>
      </div>

      <div v-if="mgmtItems.length" class="my-2 border-t border-[#F0F0F0]" />

      <div class="space-y-0.5">
        <NuxtLink
          v-for="item in mgmtItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors"
          :class="isActive(item.to)
            ? 'bg-[#E11D4812] text-[#BE123C] font-semibold'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'"
        >
          <component
            :is="sidebarIconMap[item.icon]"
            class="w-[14px] h-[14px] shrink-0"
            :class="isActive(item.to) ? 'text-[#E11D48]' : 'text-gray-400'"
            aria-hidden="true"
          />
          {{ item.label }}
        </NuxtLink>
      </div>
    </nav>

    <!-- User panel -->
    <div class="px-2 py-3 border-t border-[#F0F0F0]">
      <div class="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#FAFAFA]">
        <div class="w-7 h-7 rounded-full bg-[#E11D4822] flex items-center justify-center text-[10px] font-bold text-[#BE123C] shrink-0">
          {{ initials }}
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[12px] font-semibold text-[#0A0A0A] truncate">{{ auth.user?.name }}</div>
          <div class="text-[10px] text-gray-400 capitalize">{{ auth.user?.role }}</div>
        </div>
      </div>
      <button
        type="button"
        class="mt-2 w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-[12px] font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        @click="logout"
      >
        <ArrowRightOnRectangleIcon class="w-4 h-4 shrink-0" aria-hidden="true" />
        Log out
      </button>
    </div>
  </aside>
</template>
