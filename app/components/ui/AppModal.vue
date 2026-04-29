<script setup lang="ts">
defineProps<{ open: boolean; title?: string }>()
defineEmits<{ (e: 'close'): void }>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      @click.self="$emit('close')"
    >
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div class="border-b border-[#F0F0F0] px-5 py-4 flex items-center justify-between">
          <h3 class="font-semibold text-[15px] text-[#0A0A0A]">{{ title }}</h3>
          <button
            type="button"
            class="w-7 h-7 inline-flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            @click="$emit('close')"
          >
            ✕
          </button>
        </div>
        <div class="p-5 space-y-3 overflow-y-auto"><slot /></div>
        <div
          v-if="$slots.footer"
          class="border-t border-[#F0F0F0] px-5 py-4 flex justify-end gap-2 bg-[#FAFAFA] rounded-b-2xl"
        >
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
