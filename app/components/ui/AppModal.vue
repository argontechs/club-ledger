<script setup lang="ts">
defineProps<{ open: boolean; title?: string }>()
defineEmits<{ (e: 'close'): void }>()
</script>
<template>
  <div v-if="open" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" @click.self="$emit('close')">
    <div class="bg-white rounded shadow-xl w-full max-w-lg">
      <div class="border-b px-4 py-3 flex items-center justify-between">
        <h3 class="font-semibold">{{ title }}</h3>
        <button class="text-slate-400 hover:text-slate-700" @click="$emit('close')">✕</button>
      </div>
      <div class="p-4"><slot /></div>
      <div class="border-t px-4 py-3 bg-slate-50"><slot name="footer" /></div>
    </div>
  </div>
</template>
