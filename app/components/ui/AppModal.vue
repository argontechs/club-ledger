<script setup lang="ts">
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
    <div
      v-if="open"
      class="fixed inset-0 z-50 bg-black/40 flex md:items-center md:justify-center md:p-4"
      @click.self="$emit('close')"
    >
      <div
        class="bg-white shadow-xl w-full h-full md:h-auto md:max-h-[90vh] md:rounded-2xl overflow-hidden flex flex-col"
        :class="sizeClass"
      >
        <div class="border-b border-[#F0F0F0] px-5 py-4 flex items-center justify-between shrink-0">
          <h3 class="font-semibold text-[15px] text-[#0A0A0A]">{{ title }}</h3>
          <button
            type="button"
            class="w-7 h-7 inline-flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            @click="$emit('close')"
          >
            ✕
          </button>
        </div>
        <div class="p-5 space-y-3 overflow-y-auto flex-1"><slot /></div>
        <div
          v-if="$slots.footer"
          class="border-t border-[#F0F0F0] px-5 py-4 flex flex-col sm:flex-row justify-end gap-2 bg-[#FAFAFA] md:rounded-b-2xl shrink-0"
        >
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
