<script setup lang="ts">
defineProps<{
  modelValue?: string | number | null
  placeholder?: string
  type?: string
  label?: string
  error?: string
  disabled?: boolean
}>()
defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>

<template>
  <label class="block">
    <span
      v-if="label"
      class="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5"
    >{{ label }}</span>
    <input
      :type="type ?? 'text'"
      :value="modelValue ?? ''"
      :placeholder="placeholder"
      :disabled="disabled"
      class="w-full bg-white border border-[#E0E0E0] rounded-lg px-3 py-2 text-[13px] text-[#0A0A0A] outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-[#E11D48]/10 transition-colors disabled:bg-gray-50 disabled:opacity-70"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
    <span v-if="error" class="block mt-1 text-[11px] text-red-600">{{ error }}</span>
  </label>
</template>
