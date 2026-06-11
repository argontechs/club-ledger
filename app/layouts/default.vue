<script setup lang="ts">
import { onMounted } from 'vue'
import { useClub } from '~/composables/useClub'

const { refreshClubs } = useClub()
onMounted(refreshClubs)
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
  </div>
</template>
