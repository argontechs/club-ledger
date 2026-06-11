<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useClub } from '~/composables/useClub'
import { useTour } from '~/composables/useTour'

const { refreshClubs } = useClub()
const route = useRoute()
const tour = useTour()

onMounted(async () => {
  await refreshClubs()
  void tour.maybeStart(route.path)
})
watch(() => route.path, (p) => { void tour.maybeStart(p) })
</script>

<template>
  <div class="flex min-h-screen bg-[var(--color-surface)] text-[var(--color-ink)]">
    <Sidebar class="hidden lg:flex" />
    <AppDrawer />
    <div class="flex-1 min-w-0 flex flex-col">
      <Header>
        <template #actions>
          <slot name="header-actions" />
        </template>
      </Header>
      <main class="flex-1 p-4 lg:p-8">
        <slot />
      </main>
    </div>
    <AppConfirmModal />
    <AppToasts />
    <TourPopover />
  </div>
</template>
