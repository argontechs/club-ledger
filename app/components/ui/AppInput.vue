<script setup lang="ts">
defineProps<{ modelValue?: string | number; placeholder?: string; type?: string; label?: string; error?: string }>()
defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>
<template>
  <label class="block text-sm">
    <span v-if="label" class="block mb-1 font-medium text-slate-700">{{ label }}</span>
    <input
      :type="type ?? 'text'"
      :value="modelValue"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      class="w-full rounded border px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-300"
    >
    <span v-if="error" class="block mt-1 text-xs text-red-600">{{ error }}</span>
  </label>
</template>
