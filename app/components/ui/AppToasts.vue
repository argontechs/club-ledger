<script setup lang="ts">
const toasts = useToasts()

const tones = {
  success: 'bg-emerald-700 ring-emerald-300/30',
  error: 'bg-rose-700 ring-rose-300/30',
  info: 'bg-[var(--color-ink)] ring-white/10',
} as const
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 left-4 sm:left-auto z-[60] flex flex-col gap-2 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          :class="[
            'pointer-events-auto rounded-xl px-4 py-3 shadow-lift text-white text-[13px] font-medium ring-1 sm:min-w-[240px] sm:max-w-[420px]',
            tones[t.tone],
          ]"
        >
          {{ t.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: transform 0.28s var(--ease-spring), opacity 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-10px) scale(0.96); }
</style>
