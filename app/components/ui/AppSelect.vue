<script setup lang="ts">
defineProps<{
  modelValue?: string | number | null
  label?: string
  options: Array<{ value: string | number | null; label: string }>
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
    <select
      :value="modelValue ?? ''"
      :disabled="disabled"
      class="w-full bg-white border border-[#E0E0E0] rounded-lg px-3 py-2 text-[13px] text-[#0A0A0A] outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-[#E11D48]/10 transition-colors disabled:bg-gray-50 disabled:opacity-70"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="o in options" :key="String(o.value)" :value="o.value ?? ''">{{ o.label }}</option>
    </select>
  </label>
</template>
