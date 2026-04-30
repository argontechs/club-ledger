<script setup lang="ts">
import { computed } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'

const props = withDefaults(defineProps<{ open: boolean; title?: string; size?: 'md' | 'lg' }>(), {
  size: 'md',
})
defineEmits<{ (e: 'close'): void }>()

const sizeClass = computed(() =>
  props.size === 'lg' ? 'md:max-w-2xl' : 'md:max-w-lg',
)
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 bg-[#1a120c]/50 backdrop-blur-sm flex md:items-center md:justify-center md:p-4"
        @click.self="$emit('close')"
      >
        <div
          class="bg-[var(--color-card)] shadow-lift w-full h-full md:h-auto md:max-h-[90vh] md:rounded-2xl overflow-hidden flex flex-col border border-[var(--color-border-2)]"
          :class="sizeClass"
          @click.stop
        >
          <div class="border-b border-[var(--color-hairline)] px-5 py-4 flex items-center justify-between shrink-0">
            <h3 class="font-semibold text-[15px] text-[var(--color-ink)] tracking-tight">{{ title }}</h3>
            <button
              type="button"
              class="press w-8 h-8 inline-flex items-center justify-center rounded-lg text-[var(--color-muted-2)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
              aria-label="Close"
              @click="$emit('close')"
            >
              <XMarkIcon class="w-4 h-4" />
            </button>
          </div>
          <div class="p-5 space-y-3 overflow-y-auto flex-1"><slot /></div>
          <div
            v-if="$slots.footer"
            class="border-t border-[var(--color-hairline)] px-5 py-4 flex flex-col sm:flex-row justify-end gap-2 bg-[var(--color-hairline)] md:rounded-b-2xl shrink-0"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.18s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active > div, .modal-leave-active > div {
  transition: transform 0.22s var(--ease-spring), opacity 0.18s ease;
}
.modal-enter-from > div { transform: translateY(8px) scale(0.98); opacity: 0; }
.modal-leave-to > div   { transform: translateY(8px) scale(0.98); opacity: 0; }
</style>
